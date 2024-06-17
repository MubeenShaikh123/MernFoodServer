const express = require('express')
const connect=require('./Mongoose/connection')
const cors=require('cors')
require('dotenv').config({path:'./variables.env'})
const Port=process.env.PORT

const app = express()
app.use(express.urlencoded({extended:false}))
app.use(express.json())
app.use(cors())
connect();

app.use('/api', require('./router/router'));

app.listen(Port, () => {
  console.log(`App listening on : http://localhost:${Port}`)
})