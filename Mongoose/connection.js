const mongoose = require('mongoose')

const connect=async() => {
    try {
        const con = await mongoose.connect(process.env.MONGOURL, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log(`Mongodb is Connected: ${con.connection.host}`)
    }
    catch(err){
        console.log(`Mongodb is not connected`)
        console.log(err)
        process.exit(1)
    }
}

module.exports=connect;