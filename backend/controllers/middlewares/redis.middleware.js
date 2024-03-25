const Redis=require('ioredis');
require('dotenv').config();
const RedisConnection=new Redis({
    port:process.env.RedisPort,
    host:process.env.RedisHost,
    password:process.env.RedisPass
},{
    maxRetriesPerRequest: null
});
const RedisToken=async(email)=>{
    try{
        const token =await RedisConnection.get(email);
        return token; 
    }catch(err){
        throw new Error(`Error Retrieving token from Redis for email ${email}.`);
    }
};
module.exports={RedisConnection,RedisToken}