const express=require('express');
const {google}=require('googleapis');
const axios=require('axios');
const nodemailer=require('nodemailer');
const {Queue}=require('bullmq');
const OpenAI = require('openai');
const createConfig=require('../utils/config.util');
const {RedisConnection,RedisToken}=require('../middlewares/redis.middleware');
const {OAuth2Client}=require('google-auth-library');
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY});
const googleRoutes=express.Router();
googleRoutes.use(express.json());
const oAuthGoogle=new OAuth2Client({
    clientId: process.env.Google_clientId,
    clientSecret: process.env.Google_clientSecret,
    redirectUri: process.env.Google_redirectUri
})

const scopes=[
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.modify",
//   "https://www.googleapis.com/auth/gmail.metadata"
]

googleRoutes.get('/auth/google',(req,res)=>{
    const url=oAuthGoogle.generateAuthUrl({
        access_type:'offline',
        scope:scopes,
    })
    res.redirect(url);
})
let accessToken;
googleRoutes.get('/auth/google/callback',async(req,res)=>{
    const {code}=req.query;
    try{
        const {tokens}=await oAuthGoogle.getToken(code);
        const {access_token,referesh_token,scope}=tokens;
        accessToken=access_token;
        if(scope.includes(scopes.join(''))){
            res.send("Restricted scopes are passed");
        }else{
            res.send("Restrictes Scopes failed")
        }
    }catch(err){
        res.status(500).json({error:"Error in Google authorization",err});
    }
});
//  functions that require direct accesstoken from google

const getUser=async(req,res)=>{
    try{
        const url=`https://gmail.googleapis.com/gmail/v1/users/${req.params.email}/profile`
        const token=accessToken;
        RedisConnection.setex(req.params.email,3600,token);
        const config=createConfig(url,token);
        const response=await axios(config);
        res.json(response.data);
    }catch(err){
        res.status(401).send(err.message);
    }
}
const mailQueue = new Queue('mail-queue', { connection: RedisConnection });
    async function start(body){
        const res= await mailQueue.add(
            "Email to the selected User",
            {
                from:body.from,
                to:body.to,
                id:body.id,
            },{
                removeOnComplete: true  
            }
        );
        console.log("Job added to queue",res.id);
    }
    const sendEmail = async (req,res) => {
        try {
        const access_token = accessToken;
         const emailTransporter = nodemailer.createTransport({
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
            from: req.body.sender,
            to: req.body.receiver,
            subject: "",
            text: "",
            html: "",
        };
        
        let emailContent = "";
        if (req.body.label === "Interested") {
            emailContent = `If the email mentions they are interested to know more, your reply should ask them if they are willing to hop on to a demo call by suggesting a time from your end.
                            write a small text on above request in around 100-150 words`;
            emailOptions.subject = `User is : ${req.body.label}`;
        } else if (req.body.label === "Not Interested") {
            emailContent = `If the email mentions they are not interested, your reply should ask them for feedback on why they are not interested.
                            write a small text on above request in around 50 -70 words`;
            emailOptions.subject = `User is : ${req.body.label}`;
        } else if (req.body.label === "More information") {
            emailContent = `If the email mentions they are interested to know more, your reply should ask them if they can give some more information whether they are interested or not as it's not clear from their previous mail.
                            write a small text on above request in around 70-80 words`;
            emailOptions.subject = `User wants : ${req.body.label}`;
        }
    
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo-0301",
            max_tokens: 60,
            temperature: 0.5,
            messages: [
            {
                role: "user",
                content: emailContent,
            },
            ],
        });
        
        emailOptions.subject = `User wants : ${req.body.label}`;
        emailOptions.text = `${response.choices[0].message.content}`;
        emailOptions.html = `<p>${response.choices[0].message.content}</p>
                    <img src="" alt="reachinbox">`;
        console.log(emailOptions);
        const emailResult = await emailTransporter.sendMail(emailOptions);
        return res.json({emailResult});
        } 
        catch (error) {
            res.send(erroe)
        console.log("Can't send email: " + error);
        }
    }; 
    
    const analyzeAndSendEmail = async (req,res) => {
        try {
          const { sender, receiver } = req.body;
          const gmailService = google.gmail({ version: "v1", auth:oAuthGoogle});
          const emailMessage = await gmailService.users.messages.get({
            userId: "me",
            id: req.body.id,
            format: "full",
          });
          const payload = emailMessage.data.payload;
          const headers = payload.headers;
          const subject = headers.find((header) => header.name === "Subject")?.value;
      
          let textContent = "";
          if (payload.parts) {
            const textPart = payload.parts.find(
              (part) => part.mimeType === "text/plain"
            );
            if (textPart) {
              textContent = Buffer.from(textPart.body.data, "base64").toString(
                "utf-8"
              );
            }
          } else {
            textContent = Buffer.from(payload.body.data, "base64").toString("utf-8");
          }
          let snippet = emailMessage.data.snippet;
          const emailContext = `${subject} ${snippet} ${textContent} `;
      
          const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo-0301",
            max_tokens: 60,
            temperature: 0.5,
            messages: [
              {
                role: "user",
                content: `Based on the following text, provide a one-word answer by categorizing the content and assigning a label from the given options: Interested, Not Interested, More information. Text: ${emailContext}`,
              },
            ],
          });
      
          const prediction = response.choices[0]?.message.content;
          
          let label;
          switch (prediction) {
            case "Interested":
              label = "Interested";
              break;
            case "Not Interested":
              label = "Not Interested";
              break;
            case "More information.":
              label = "More information";
              break;
            default:
              label = "Not Sure";
          }
      
          const emailInfo = {
            subject,
            textContent,
            snippet: emailMessage.data.snippet,
            label,
            from: sender,
            to: receiver,
          };
          await sendEmail(emailInfo);
          res.json({msg:"Sent Email Info"});
        } catch (error) {
          console.log("Error fetching email:", error.message);
        }
    };
    
    const sendEmailViaQueue = async (request, response) => {
        try {
            const { id } = request.params;
            const { from, to } = request.body;
            start({ from, to, id});
        } catch (error) {
            console.log("Error occurred while processing email via queue:", error.message);
        }
        response.send("Email processing has been queued.");
    };
    
module.exports={googleRoutes,getUser,sendEmail,sendEmailViaQueue,analyzeAndSendEmail};