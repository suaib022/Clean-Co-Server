const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = 5000;
require('dotenv').config();

const secret = 'bishal secret bepar separ';


app.use(express.json());
app.use(cookieParser());
app.use(cors(
    {
        origin: 'http://localhost:5173',
        credentials: true,
    }
))
app.get('/', (req, res) => {
    res.send('hello world');
})

app.listen(port, () => {
    console.log(`Clean-Co-Server is running on port : ${port}`)
})


// ---------------------------- //

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.h4dewp5.mongodb.net/clean-co?retryWrites=true&w=majority`;



// Create a MongoClient with a MongoClientOptions object to set the Stable API version
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

        const serviceCollection = client.db('clean-co').collection('services');
        const bookingCollection = client.db('clean-co').collection('bookings');


        // middleware
        const gateman = (req, res, next) => {
            const { token } = req.cookies;
            // console.log(token);
            // if client does not send token
            if (!token) {
                return res.status(401).send({ message: 'Client didnt send token' })
            }
            // verify
            jwt.verify(token, secret, function (err, decoded) {
                if (err) {
                    return res.status(401).send({ message: 'Client sent vulval token :3' })
                }

                req.user = decoded;
                next();
            })
        }

        // filtering object
        // http://localhost:5000/api/v1/services
        // http://localhost:5000/api/v1/services?category=Pet Care

        // sorting objects
        // http://localhost:5000/api/v1/services?sortField=price&sortOrder=asc

        // pagination
        // http://localhost:5000/api/v1/services?page=1&limit=10

        app.get('/api/v1/services',gateman, async (req, res) => {

            let queryObj = {};

            const category = req.query.category;

            if (category) {
                queryObj.category = category;
            }
            // ------------------------------


            let sortObj = {};

            const sortField = req.query.sortField;
            const sortOrder = req.query.sortOrder;

            if(sortField && sortOrder){
                sortObj[sortField] = sortOrder;
            }
            // -----------------------------

            const page = Number(req.query.page);
            const limit = Number(req.query.limit);
            const skip = (page - 1)* limit;

            const cursor = serviceCollection.find(queryObj).skip(skip).limit(limit).sort(sortObj);
            const result = await cursor.toArray();

            const total = await serviceCollection.countDocuments();


            res.send({
                result,
                total
            })
        })

        app.post('/api/v1/user/create-booking', async (req, res) => {
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        })

        // user specific booking

        app.get('/api/v1/user/bookings', gateman, async (req, res) => {
            const tokenEmail = req.user.email;
            const queryEmail = req.query.email;

            // console.log(queryEmail);
            // console.log(tokenEmail);

            if (tokenEmail !== queryEmail) {
                return res.status(403).send({ message: 'forbidden access :3' })
            }

            let query = {};
            if (queryEmail) {
                query.email = queryEmail;
            }

            const result = await bookingCollection.find(query).toArray();
            res.send(result);

        })

        app.delete('/api/v1/user/cancel-booking/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookingCollection.deleteOne(query);

            res.send(result);
        })

        app.post('/api/v1/auth/access-token', (req, res) => {
            // create token and send to client

            const user = req.body;
            console.log(user);
            const token = jwt.sign(user, secret);
            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none'
            }).send({ success: true })
        })

        app.get('/api/v1/services/:serviceId', async (req, res) => {
            const id = req.params.serviceId;
            const query = { _id: new ObjectId(id) };
            const result = await serviceCollection.findOne(query);

            res.send(result);
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

//-----------------------------------// 