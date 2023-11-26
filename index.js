const express = require('express')
require('dotenv').config()
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.VITE_STRIPE_SECRET_KEY)
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

// token verify 
const tokenVarify = (req, res, next) => {
    // console.log('---------------', req.headers.authorization, '---------------',);
    // console.log({ req });
    // console.log({req});
    if (!req.headers.authorization) {
        res.status(401).send({ Message: "Unauthorize 1" })
    }
    const token = req.headers.authorization.split(' ')[1]
    // console.log("25 token ", token);
    // token varify ---------
    jwt.verify(token, process.env.SECRET_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(401).send({ Message: "Unauthorize 2" })
        }
        // console.log({ decoded });
        req.decoded = decoded
        // console.log(decoded);

        next()
    });
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();


        const classCollection = client.db("teach-on-easy").collection('class')
        const feedbackCollection = client.db("teach-on-easy").collection('feedback')
        const usersCollection = client.db("teach-on-easy").collection('users')
        const paymentsCollection = client.db("teach-on-easy").collection('payments')

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            // console.log('>>>>>>>>>>>>>>>>>>>>>>>>', email);
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            // console.log('>>>>>>>>>>>>>>>>>>>>>>>>', user);
            const isAdmin = user?.role === 'admin'
            // console.log({ isAdmin });
            console.log(`${email} <----: Admin roll :---> ${isAdmin}`);
            if (!isAdmin) {
                return res.status(403).send({ Message: 'Forbiden access' })
            }
            next()
        }

        // ############# class collection #############
        //all class get  // useAllClasses
        app.get('/classes', async (req, res) => {
            try {
                const result = await classCollection.find().toArray()
                console.log("all class get ");
                res.send(result)
            }
            catch (err) {
                res.send({ status: false })
                console.log(err);
            }
        })

        //single class get  // usesingleclass
        app.get('/classes/:id', async (req, res) => {
            try {
                const id = req.params.id
                const query = { _id: new ObjectId(id) }
                const result = await classCollection.findOne(query)
                console.log("single class get ");
                res.send(result)
            }
            catch (err) {
                res.send({ status: false })
                console.log(err);
            }
        })

        // class add //addclass page
        app.post('/classes', tokenVarify, async (req, res) => {
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
        // update one (totalenroll filed update) // payment
        app.patch('/classes', async (req, res) => {
            try {
                const data = req.body;
                // console.log(data);
                const id = data?._id
                console.log(id);
                const query = { _id: new ObjectId(id) }
                const updateData = {
                    $set: {
                        totalEnroll: data?.totalEnroll ? data?.totalEnroll + 1 : 1,
                    }
                }
                const options = { upsert: true };
                const result = await classCollection.updateOne(query, updateData)
                console.log(result);
                res.send(result)
            }
            catch (err) {
                res.send({ status: false })
                console.log(err);
            }
        })

        // ############# user collection #############
        app.get('/users/all', tokenVarify, verifyAdmin, async (req, res) => {
            try {
                const result = await usersCollection.find().toArray()
                // console.log(result);
                res.send(result)
                console.log("all user get ");
            }
            catch (err) {
                console.log(err);
                res.send({ status: false })
            }
        })
        // user add //signup /googlepupup
        app.post('/users', async (req, res) => {
            try {
                const user = req.body
                console.log(user);
                const query = { email: user.email };
                const isExist = await usersCollection.findOne(query)
                if (isExist) {
                    // console.log({ isExist });
                    return res.send({ Message: "This user already axist", insertedId: null })
                }
                const result = await usersCollection.insertOne(user)
                console.log(result);
                res.send(result)
                console.log("user save ");
            }
            catch (err) {
                console.log(err);
                res.send({ status: false })
            }
        })
        // user role chaker api // userolechaker 
        app.get('/user-role-chaker/:email', async (req, res) => {
            try {
                const email = req?.params?.email;
                console.log(email);
                const query = { email: email }
                const result = await usersCollection.findOne(query)
                res.send(result)
                console.log("user role chaker api ");
            }
            catch (err) {
                console.log(err);
            }

        })
        // user-to-admin api // dashbord > users 
        app.patch('/user-to-admin/:id', tokenVarify, async (req, res) => {
            try {
                const id = req.params.id;
                console.log(id);
                const query = { _id: new ObjectId(id) }
                const updateData = {
                    $set: {
                        role: 'admin'
                    }
                }
                const options = { upsert: true };
                const result = await usersCollection.updateOne(query, updateData, options)
                console.log(result);
                res.send(result)
            }
            catch (err) {
                res.send({ status: false })
                console.log(err);
            }
        })

        // user-delete api // dashbord > users 
        app.patch('/user-delete/:id', tokenVarify, async (req, res) => {
            try {
                const id = req.params.id;
                console.log(id);
                const query = { _id: new ObjectId(id) }
                const result = await usersCollection.deleteOne(query,)
                // console.log(result);
                console.log("user delete");
                res.send(result)
            }
            catch (err) {
                res.send({ status: false })
                console.log(err);
            }
        })


        // ########## ###### stripe payment and payment collection  #####################
        app.post('/create-payment-intent', async (req, res) => {
            try {
                const { price } = req.body;
                console.log({ price });
                const amount = parseInt(price * 100)
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amount,
                    currency: "usd",
                    payment_method_types: [
                        "card"
                    ],
                })
                console.log("paymentIntent create ");
                // res.send(
                //     "bclientSecret: paymentIntent.client_secret,"
                // )
                res.send({
                    clientSecret: paymentIntent.client_secret,
                })
            }
            catch (err) {
                console.log(err);
            }
        })
        // user payment add // payment 
        app.post('/payments', async (req, res) => {
            try {
                const data = req.body;
                // console.log(data);
                const result = await paymentsCollection.insertOne(data)
                res.send(result)
                console.log('user class purcese');
            }
            catch (err) {
                console.log(err);
            }
        })















        // -------------------------- token create ----------
        // tokent create  api 
        app.post('/jwt', async (req, res) => {
            try {
                const user = req.body
                console.log(user);
                const token = jwt.sign(user, process.env.SECRET_TOKEN, {
                    expiresIn: '2h'
                })
                res.send({ token })
                console.log(token);
            }
            catch (err) {
                res.status(402).send({ message: 'Token Not Create' })
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

