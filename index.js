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
        const teachersCollection = client.db("teach-on-easy").collection('teachers')
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

        // ############# teachers collection #############
        //teacher uer to teacher //teact on easy form
        app.post('/teachers/teacher', async (req, res) => {
            try {
                const data = req.body;
                const query = { email: data?.email }
                const userFind = await teachersCollection.find(query).toArray()
                if (userFind) {
                    await teachersCollection.deleteOne(query)
                }
                const result = await teachersCollection.insertOne(data)
                res.send(result)
            }
            catch (err) {
                console.log('teacher request post err', err);
            }
        })
        // teachet requst chaker // useTeacherRequest  //teact on easy form
        app.get('/teachers/:email', async (req, res) => {
            try {
                const email = req?.params?.email;
                const query = { email: email }
                const result = await teachersCollection.findOne(query)
                res.send({ status: result?.status || 'user' })
                console.log(result?.status);
            }
            catch (err) {
                console.log('teacher request post err', err);
            }
        })
        //  all teacher get admin route // teacherRequest  
        app.get('/request/teachers', tokenVarify, verifyAdmin, async (req, res) => {
            try {
                const result = await teachersCollection.find().toArray()
                res.send(result)
                // console.log({result});
            }
            catch (err) {
                console.log('teacher request post err', err);
            }
        })
        // teacher request approved api // teacherRequest
        app.patch('/request-approved/:id', tokenVarify, verifyAdmin, async (req, res) => {
            try {
                const id = req?.params?.id;
                const query = { _id: new ObjectId(id) }
                const updateDoc = {
                    $set: {
                        status: 'approved'
                    }
                }
                const result = await teachersCollection.updateOne(query, updateDoc)
                // ========== user role update +========
                const email = req.body?.email
                console.log({ email });
                const userQuery = { email: email }
                const userUpdateDoc = {
                    $set: {
                        role: 'teacher'
                    }
                }
                // console.log({ userQuery });
                const userRes = await usersCollection.updateOne(userQuery, userUpdateDoc)
                // console.log({ userRes });
                // console.log(result);
                res.send(result)
            }
            catch (err) {
                console.log('teacher request approve err', err);
            }
        })
        // teacher request reject api // teacherRequest
        app.patch('/request-rejected/:id', tokenVarify, verifyAdmin, async (req, res) => {
            try {
                const id = req?.params?.id;
                const query = { _id: new ObjectId(id) }
                const updateDoc = {
                    $set: {
                        status: 'rejected'
                    }
                }
                const result = await teachersCollection.updateOne(query, updateDoc)
                // ========== user role update +========
                const email = req.body?.email
                const userQuery = { email: email }
                const userUpdateDoc = {
                    $set: {
                        role: 'user'
                    }
                }
                const userRes = await usersCollection.updateOne(userQuery, userUpdateDoc)
                // console.log({ email });
                // console.log({ userQuery });
                // console.log({ userRes });
                res.send(result)
            }
            catch (err) {
                console.log('teacher request approve err', err);
            }
        })



        // ############# class collection #############
        //all class get  // useAllClasses publick route
        app.get('/classes/all', async (req, res) => {
            try {
                const query = { status: 'approved' }
                const result = await classCollection.find(query).toArray()
                console.log("all class get ");
                res.send(result)
            }
            catch (err) {
                res.send({ status: false })
                console.log("all class get", err);
            }
        })

        //all class get  // useAllClass admin route
        app.get('/classes', tokenVarify, verifyAdmin, async (req, res) => {
            try {

                const result = await classCollection.find().toArray()
                // console.log("all class get ");
                res.send(result)
            }
            catch (err) {
                res.send({ status: false })
                console.log("all class get", err);
            }
        })

        //single class get  // usesingleclass
        app.get('/classes/:id', async (req, res) => {
            try {
                const id = req.params?.id
                const query = { _id: new ObjectId(id) }
                const result = await classCollection.findOne(query)
                // console.log("single class get ");
                res.send(result)
            }
            catch (err) {
                res.send({ status: false })
                console.log("single class get ", err);
            }
        })

        //my class all get  // useMyClass // teacher route
        app.get('/classes/my-class/:email', async (req, res) => {
            try {
                const email = req.params?.email
                const query = { email: email }
                const result = await classCollection.find(query).toArray()
                // console.log("single class get ");
                res.send(result)
            }
            catch (err) {
                // res.send({ status: false })
                console.log("my all class get err: ", err);
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
                console.log("class add success", err);
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
                // const options = { upsert: true };
                const result = await classCollection.updateOne(query, updateData)
                // console.log(result);
                res.send(result)
            }
            catch (err) {
                res.send({ status: false })
                console.log(err);
            }
        })
        // update one (totalenroll filed update) // teacher dashbord // myclassUpdate 
        app.put('/classes/:id', tokenVarify, async (req, res) => {
            try {
                const data = req.body;
                // console.log(data);
                const id = req.params?.id
                console.log(id);
                const query = { _id: new ObjectId(id) }
                const updateData = {
                    $set: {
                        title: data.title,
                        name: data.name,
                        category: data.category,
                        date: data.date,
                        totalTime: data.totalTime,
                        email: data.email,
                        totalEnroll: data.totalEnroll,
                        price: data.price,
                        description: data.description,
                        image: data.image,
                        avater: data.avater,
                        status: data.status,
                        progress: data.progress,
                    }
                }
                // const options = { upsert: true };
                const result = await classCollection.updateOne(query, updateData)
                // console.log(result);
                res.send(result)
            }
            catch (err) {
                res.send({ status: false })
                console.log(err);
            }
        })


        // update one (status filed approved ) // dashbord > allClass admin route
        app.patch('/classes/approved/:id', tokenVarify, verifyAdmin, async (req, res) => {
            try {
                const id = req.params?.id;
                // console.log(id);
                const query = { _id: new ObjectId(id) }
                const updateData = {
                    $set: {
                        status: "approved",
                    }
                }
                const options = { upsert: true };
                const result = await classCollection.updateOne(query, updateData, options)
                // console.log(result);
                res.send(result)
            }
            catch (err) {
                res.send({ status: false })
                console.log(err);
            }
        })

        // update one (status filed rejected ) // dashbord > allClass admin route
        app.patch('/classes/rejected/:id', tokenVarify, verifyAdmin, async (req, res) => {
            try {
                const id = req.params?.id;
                // console.log(id);
                const query = { _id: new ObjectId(id) }
                const updateData = {
                    $set: {
                        status: "rejected",
                    }
                }
                const options = { upsert: true };
                const result = await classCollection.updateOne(query, updateData, options)
                // console.log(result);
                res.send(result)
            }
            catch (err) {
                res.send({ status: false })
                console.log('class admin rejected', err);
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
        // user profile info get // myprofile 
        app.get('/users/profile/:email', async (req, res) => {
            try {
                const email = req.params?.email;
                console.log({ email });
                const query = { email: email }
                const result = await usersCollection.findOne(query)
                console.log({ result });
                res.send(result)
                // console.log("user profile info get ");
            }
            catch (err) {
                console.log("user profile info get ", err);
                res.send({ status: false })
            }
        })
        // user add //signup /googlepupup
        app.post('/users', async (req, res) => {
            try {
                const user = req.body
                // console.log(user);
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
                // console.log(email);
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
                // console.log(id);
                const query = { _id: new ObjectId(id) }
                const updateData = {
                    $set: {
                        role: 'admin'
                    }
                }
                const options = { upsert: true };
                const result = await usersCollection.updateOne(query, updateData, options)
                // console.log(result);
                res.send(result)
            }
            catch (err) {
                res.send({ status: false })
                console.log(err);
            }
        })

        // user-delete api // dashbord > users 
        app.delete('/user-delete/:id', tokenVarify, async (req, res) => {
            try {
                const id = req.params.id;
                // console.log(id);
                const query = { _id: new ObjectId(id) }
                const result = await usersCollection.deleteOne(query,)
                // console.log(result);
                // console.log("user delete");
                res.send(result)
            }
            catch (err) {
                res.send({ status: false })
                console.log("user delete", err);
            }
        })

        // user-delete api // dashbord > profile  
        app.patch('/user/profile-update/:id', tokenVarify, async (req, res) => {
            try {
                const id = req.params.id;
                const data = req.body
                // console.log(id);
                const query = { _id: new ObjectId(id) }
                const updateDoc = {
                    $set: {
                        phone: data.phone,
                    }
                }
                const result = await usersCollection.updateOne(query, updateDoc)
                // console.log(result);
                console.log("user update ");
                res.send(result)
            }
            catch (err) {
                res.send({ status: false })
                console.log("user update", err);
            }
        })





        // ########## ###### stripe payment and payment collection  #####################
        app.post('/create-payment-intent', async (req, res) => {
            try {
                const { price } = req.body;
                // console.log({ price });
                const amount = parseInt(price * 100)
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amount,
                    currency: "usd",
                    payment_method_types: [
                        "card"
                    ],
                })
                // console.log("paymentIntent create ");
                // res.send(
                //     "bclientSecret: paymentIntent.client_secret,"
                // )
                res.send({
                    clientSecret: paymentIntent.client_secret,
                })
            }
            catch (err) {
                console.log("paymentIntent create ", err);
            }
        })
        // user payment add // payment 
        app.post('/payments', async (req, res) => {
            try {
                const data = req.body;
                // console.log(data);
                const result = await paymentsCollection.insertOne(data)
                res.send(result)
                // console.log('user class purcese');
            }
            catch (err) {
                console.log("user class purcese", err);
            }
        })
        // user enrole classes // useEnroleClass 
        app.get("/payment/user/:email", tokenVarify, async (req, res) => {
            try {
                const email = req.params?.email;
                // console.log(email);
                const query = { email }
                const result = await paymentsCollection.find(query).toArray()
                // res.send(result)
                // console.log(result);
                if (result) {
                    // const allId = result?.map(item => item?.classId)
                    // console.log(allId);
                    const query = {
                        _id:
                            { $in: result.map(id => new ObjectId(id?.classId)) }
                    }
                    // console.log(query);
                    const userClasses = await classCollection.find(query).toArray()
                    res.send(userClasses)
                }
            }
            catch (err) {
                res.send({ status: false })
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

