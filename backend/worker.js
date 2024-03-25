const { Worker } = require('bullmq');
const {RedisConnection,RedisToken}=require('./controllers/middlewares/redis.middleware');
const Redis=require('ioredis');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
require('dotenv').config();
const { default: OpenAI } = require('openai');
const axios = require("axios")
const createConfig=require('./controllers/utils/config.util');
const {OAuth2Client}=require('google-auth-library');

const oAuthGoogle=new OAuth2Client({
    clientId: process.env.Google_clientId,
    clientSecret: process.env.Google_clientSecret,
    redirectUri: process.env.Google_redirectUri
})


oAuthGoogle.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY});
// const RedisConnection=new Redis({
//   port:process.env.RedisPort,
//   host:process.env.RedisHost,
//   password:process.env.RedisPass
// },{
//   maxRetriesPerRequest: null
// });
let hardCodedReply = true;
const sendEmail = async (data) => {
  try {
    const token = await RedisToken(data.to);
    
  
    const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        },
        tls: {
        rejectUnauthorized: false,
        },
    });

    const emailOptions = {
      from: data.from,
      to: data.to,
      subject: 'Greetings, from Aditi Email Support',
      text: 'Hello,This is email support from Aditi Email support',
      html: '<h1>Hello,From Aditi Email Support</h1>'
    };

    let response;
    if (!hardCodedReply) {
      response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-0301",
        max_tokens: 60,
        temperature: 0.5,
        messages: [{
          role: "user", content: `If the email mentions they are interested to know more, your reply should ask them if they are willing to hop on to a demo call by suggesting a time.
                  write a small text on above request in around 50 -70 words`
        }],
      });
    }

    if (data.label === 'Interested') {
      emailOptions.subject = `User is : ${data.label}`;
      emailOptions.text = hardCodedReply ? `Thank you for your email expressing interest in knowing more about our product/service. However, it is not clear from your previous mail whether you are interested or not. Could you please provide us with some more information? This will help us understand your requirements better and provide you with relevant information.` : `${response.choices[0].message.content}`;
      emailOptions.html = `<p>${emailOptions.text}</p><img src="" alt="reachinbox">`;
    } else if (data.label === 'Not Interested') {
      emailOptions.subject = `User is : ${data.label}`;
      emailOptions.text = hardCodedReply ? `Thank you for considering our offering. We respect your decision. Could you kindly share feedback on why our product/service did not align with your needs? Your insights are invaluable as we strive to improve our offerings. Looking forward to hearing from you.` : `${response.choices[0].message.content}`;
      emailOptions.html = `<p>${emailOptions.text}</p><img src="" alt="reachinbox">`;
    } else if (data.label === 'More information') {
      emailOptions.subject = `User wants : ${data.label}`;
      emailOptions.text = hardCodedReply ? `Thank you for your interest in our product/service! We appreciate your enthusiasm. Could you please provide more details on your level of interest? Your previous email was positive, and we want to ensure we tailor our response accordingly. Any additional insights you can share would be greatly helpful. Looking forward to hearing more from you!` : `${response.choices[0].message.content}`;
      emailOptions.html = `<p>${emailOptions.text}</p><img src="" alt="reachinbox">`;
    }

    const result = await transport.sendMail(emailOptions);
    return result;

  } catch (error) {
    console.log("Can't send email ", error.message);
    console.log(error);
  }
};

const analyzeAndSendEmail = async (data1) => {
  try {
    const { from, to } = data1;
    const token = await RedisToken(to)
    const url1 = `https://gmail.googleapis.com/gmail/v1/users/${to}/messages/${data1.id}`;
    const config = createConfig(url1, token);
    const message = await axios(config);
    

    const payload = message.data.payload;
    const headers = payload.headers;
    const subject = headers.find((header) => header.name === 'Subject')?.value;

    let textContent = '';
    if (payload.parts) {
      const textPart = payload.parts.find((part) => part.mimeType === 'text/plain');
      if (textPart) {
        textContent = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    } else {
      textContent = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }
    let snippet = message.data.snippet;
    let emailContext = `${subject} ${snippet} ${textContent} `;
    let emailContextUpdated = emailContext.slice(0, 4000);

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0301",
      max_tokens: 60,
      temperature: 0.5,
      messages: [{
        role: "user", content: `based on the following text  just give one word answer, Categorizing the text based on the content and assign a label from the given options - Interested, Not Interested, More information. text is : ${emailContextUpdated}`
      }],
    });

    const prediction = response.choices[0]?.message.content;
    console.log(prediction)
    let label;
    if (prediction.includes("Not Interested")) {
      label = 'Not Interested';
    }
    else if (prediction.includes("info")) {
      label = 'More information';
    }
    else {
      label = 'Interested';
    }

    const data = { subject, textContent, snippet: message.data.snippet, label, from, to };
    console.log(data);
    const dataFromMail = await sendEmail(data);
    return dataFromMail;
  } catch (error) {
    console.log("Can't fetch email ", error.message);
    return -1;
  }
};

const sendMail = (data, jobID) => new Promise(async (req, res) => {
  let helo = await analyzeAndSendEmail(data);
  if (helo) {
    console.log(`Job ${jobID} completed and sent to ${data.to}`);
  }

  return helo;

}).then(res => console.log(res)).catch(err => console.log(err));


const mailWorker = new Worker('mail-queue', async (job) => {
    const { from, to, id, jobId } = job.data;

    console.log(`Job ${job.id} has started`);
  const result = setTimeout(async () => {
    await sendMail(job.data, job.id);
  }, 5000);
  console.log("Job in progress");
}, { connection: RedisConnection});