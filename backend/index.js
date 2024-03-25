const express=require('express');
const {googleRoutes}=require('./controllers/routes/googleOauth');
const app=express();
require('dotenv').config()
const PORT=process.env.PORT
app.use('/',googleRoutes)
app.get('/',(req,res)=>{
    res.send('Home page');
})
app.listen(PORT,()=>{
    console.log(`Server running at http://localhost:${PORT}`);
})