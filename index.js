const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const jwt = require('jsonwebtoken')
require('dotenv').config();
const cookieParser = require('cookie-parser')
const cors = require('cors');
const app = express()
const port = process.env.PORT || 5000;

// middllware
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}))
app.use(express.json())
app.use(cookieParser())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.m8ywqwd.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const logger = async (req, res, next) => {
    console.log('logger middleware:', req.host, req.originalUrl)
    next();
}

const verifytoken = async (req, res, next) => {
    const token = req.cookies?.token;
    console.log('value of token in middleware', token)
    if (!token) {
        return res.status(401).send({ meessage: 'not authorized' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            console.log(err)
            return res.status(401).send({ meessage: 'not authrized' })
        }
        console.log('value is not token', decoded)
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

        app.post('/jwt', logger, (req, res) => {
            const user = req.body;
            console.log(user)
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: false,
                })
                .send({ success: true })
        })

        app.get('/services', logger, async (req, res) => {
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

        app.get('/orders', logger, verifytoken,  async (req, res) => {
            console.log(req.query.email)
            // console.log('tok tok token', req.cookies.token)
            console.log('user in the valid token is', req.user )
            if (req.query.email !== req.user.email) {
                return res.status(403).send({message: 'forbidden access'})
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
