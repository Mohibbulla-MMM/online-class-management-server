const express = require('express')
require('dotenv').config()
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 7000 
// middle ware -------------------------
app.use(express.json())
app.use(cors())

 

 



 


app.get('/', (req, res) => {
    res.send("<h1>Teach on Easy Server is Running</h1>")
})

app.listen(port, () => {
    console.log(`Teach-on-Easy Server is Running on the Port: ${port}`);
})

