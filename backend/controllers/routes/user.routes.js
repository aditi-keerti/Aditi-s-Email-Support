const express=require('express');
const axios=require('axios');
const {RedisConnection,RedisToken}=require('../middlewares/redis.middleware');
const {getUser,sendEmail,sendEmailViaQueue,analyzeAndSendEmail}=require('./googleOauth');
const createConfig = require('../utils/config.util');
const userRoutes=express.Router();
userRoutes.use(express.json());
userRoutes.use(express.urlencoded({extended:true}));

// Getting user Information
userRoutes.get('/user/:email',getUser);

// Getting draft Emails of user
userRoutes.get('/drafts/:email',async(req,res)=>{
    try{
        const url = `https://gmail.googleapis.com/gmail/v1/users/${req.params.email}/drafts`;
        const token=await RedisToken(req.params.email);
        if(!token){
            return res.send("Token Not Found,Please login to get token")
        }
        const config=createConfig(url,token);
        const response=await axios(config);
        res.json(response.data);
    }catch(err){
            res.send(err.message);
    }
})

// Getting List of mails
userRoutes.get('/list/:email',async(req,res)=>{
    try{
    const url = `https://gmail.googleapis.com/gmail/v1/users/${req.params.email}/messages?maxResults=50`;
    const token=await RedisToken(req.params.email);
    const config=createConfig(url,token);
    const response=await axios(config);
    res.status(200).json(response.data);
    }catch(err){
        res.status(401).send(err.message);
    }
});

// Getting mail from ID
userRoutes.get('/read/:email/messages/:mesgId',async(req,res)=>{
    try{
    const url = `https://gmail.googleapis.com/gmail/v1/users/${req.params.email}/messages/${req.params.mesgId}`;
    const token=await RedisToken(req.params.email);
    const config=createConfig(url,token);
    const response=await axios(config);
    let data=await response.data;
    res.status(200).json(data);
    }catch(err){
        res.status(400).send(err.message);
    }
});
//Sending Emails
userRoutes.post('/sendemail',sendEmail);

userRoutes.post('/readdata/:id', sendEmailViaQueue);
userRoutes.post('/sendmulti', analyzeAndSendEmail);

module.exports={userRoutes}