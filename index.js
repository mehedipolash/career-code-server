const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

require("dotenv").config();

// middleware
app.use(cors());
app.use(express.json());
//---------------------------------

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.azj20jt.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    // FIXED DB NAME
    const jobCollection = client.db("carrerCode").collection("jobs");

    const applicationCollection = client
      .db("carrerCode")
      .collection("applications");

    app.get("/jobs", async (req, res) => {
      const result = await jobCollection.find().toArray();
      res.send(result);
    });

    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.findOne(query);
      res.send(result);
    });

    //  -----------------------------------
    //  job application related apis

    app.get("/applications", async (req, res) => {
      const email = req.query.email;

      const query = {
        applicantEmail: email,
      };

      const result = await applicationCollection.find(query).toArray();

      // bad way to aggregate data

      for (const application of result) {
        const jobId = application.jobId;

        const jobquery = {
          _id: new ObjectId(jobId),
        };

        const job = await jobCollection.findOne(jobquery);

        application.company = job.company;
        application.title = job.title;
        application.company_logo = job.company_logo;
      }

      res.send(result);
    });

    //delete application by user
    app.delete("/applications/:id", async (req, res) => {
      const id = req.params.id;

      const query = {
        _id: new ObjectId(id),
      };

      const result = await applicationCollection.deleteOne(query);

      res.send(result);
    });
    // --------------

    app.post("/applications", async (req, res) => {
      const application = req.body;
      const result = await applicationCollection.insertOne(application);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB!");
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Career code is Running...");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
