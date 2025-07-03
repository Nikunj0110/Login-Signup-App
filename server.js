const express=require('express')
const mongoose=require('mongoose')
const app=express()
const dotenv=require('dotenv')

//load env configuration
dotenv.config();
const PORT=process.env.PORT
app.set('view engine','ejs')
app.use(express.json());
app.use(express.urlencoded({extended:true}))
app.use(express.static('public'))

//Database Connection
// mongoose.connect(,{
//         dbName: 'Register',
// })
// .then(()=>console.log("✅ MongoDB Connected!"))
// .catch(err=>console.log("❌ Connection Error",err))
// const db=mongoose.connection;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI
    );
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("Mongodb Failed",error);
    process.exit(1);
  }
};

connectDB();

//Routes
const homeRouter=require('./routers/homeRouter')
app.use('/',homeRouter)

app.listen(PORT,()=>{
    console.log("Server Is Runnig");
})


module.exports=connectDB