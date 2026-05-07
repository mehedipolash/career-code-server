const express = require('express')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 3000

require('dotenv').config()

// middleware
app.use(cors())
app.use(express.json())

const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.azj20jt.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    await client.connect();

    // FIXED DB NAME
    const jobCollection = client.db('carrerCode').collection('jobs');

    app.get('/jobs', async (req, res) => {
      const result = await jobCollection.find().toArray();
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB!");

  } finally {

  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Career code is Running...')
})

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})