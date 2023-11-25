const express = require('express')
require('dotenv').config()
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 7000
// middle ware -------------------------
app.use(express.json())
app.use(cors())



const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@cluster0.xevn9vs.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();


        const classCollection = client.db("teach-on-easy").collection('class')
        const feedbackCollection = client.db("teach-on-easy").collection('feedback')
        const usersCollection = client.db("teach-on-easy").collection('users')
        const paymentsCollection = client.db("teach-on-easy").collection('payments')


        // ############# class collection #############
        // class add //add class page
        app.post('/classes', async (req, res) => {
            try {
                const data = req.body;
                const result = await classCollection.insertOne(data)
                console.log("class add success");
                res.send(result)
            }
            catch (err) {
                res.send({ status: false })
                console.log(err);
            }
        })



        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}

run().catch(console.dir);


app.get('/', (req, res) => {
    res.send("<h1>Teach on Easy Server is Running</h1>")
})

app.listen(port, () => {
    console.log(`Teach-on-Easy Server is Running on the Port: ${port}`);
})

