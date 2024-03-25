const express=require('express');
const {google}=require('googleapis');
const axios=require('axios');
const createConfig=require('../utils/config.util');
const {RedisConnection,RedisToken}=require('../middlewares/redis.middleware');
const {OAuth2Client}=require('google-auth-library');
require("dotenv").config();

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

module.exports={googleRoutes,getUser};