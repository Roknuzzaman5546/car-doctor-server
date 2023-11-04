const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const jwt = require('jsonwebtoken')
const cookieparser = require('cookie-parser')
require('dotenv').config();
const cors = require('cors');
const app = express()
const port = process.env.PORT || 5000;



// middllware
app.use(cors({
    origin: [
        // 'http://localhost:5173',
        'https://car-doctor-resources.web.app',
        'https://car-doctor-resources.firebaseapp.com/'
    ],
    credentials: true
}))
app.use(express.json())
app.use(cookieparser())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.m8ywqwd.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const logger = (req, res, next) => {
    console.log(req.method, req.url)
    next();
}

const verifytoken = (req, res, next) => {
    const token = req.cookies.token
    // console.log('verify token is', token)
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unathorized access' })
        }
        req.user = decoded;
        next();
    })
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const servicescollection = client.db('doctordb').collection('services')
        const orderscollection = client.db('doctordb').collection('order')

        // token related
        app.post('/jwt', logger, async (req, res) => {
            const user = req.body;
            console.log("token res", user)
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'none'
                })
                .send({ success: true })
        })

        app.post('/logout', async (req, res) => {
            const user = req.body;
            console.log(user)
            res.clearCookie('token', { maxAge: 0 }).send({ success: true })
        })

        // services related api
        app.get('/services', async (req, res) => {
            const cursor = servicescollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })


        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const quary = { _id: new ObjectId(id) }
            const options = {
                // Include only the `title` and `imdb` fields in each returned document
                projection: { title: 1, price: 1, service_id: 1, img: 1 },
            };
            const result = await servicescollection.findOne(quary, options)
            res.send(result)
        })

        app.get('/orders', logger, verifytoken, async (req, res) => {
            console.log(req.query.email)
            console.log('valid token', req.user)
            if (req.user.email !== req.query.email) {
                return res.status(403).send({ message: 'Data is invaild here' })
            }
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await orderscollection.find(query).toArray()
            res.send(result)
        })

        app.post('/orders', async (req, res) => {
            const orders = req.body
            console.log(orders)
            const result = await orderscollection.insertOne(orders)
            res.send(result)
        })

        app.patch('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const ordersupdate = req.body;
            console.log(ordersupdate)
            const updateDoc = {
                $set: {
                    status: ordersupdate.status
                },
            };
            const result = await orderscollection.updateOne(filter, updateDoc)
            res.send(result)
        })


        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id)
            const query = { _id: new ObjectId(id) }
            const result = await orderscollection.deleteOne(query)
            res.send(result)
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Doctor car is runnig')
})

app.listen(port, () => {
    console.log(`doctor car port is runnig out${port}`)
})
