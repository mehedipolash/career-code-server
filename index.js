const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const port = process.env.PORT || 3000;
require("dotenv").config();


// middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());


//our custom middleware
const logger = (req, res, next) => {
  console.log("inside the logger middleware");
  next();
};


const verifyToken = (req,res,next)=>{
  const token = req?.cookies?.token;
  // check token existance
   if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  // verify token
  jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
}



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

    // jwt token related api
    app.post("/jwt", async (req, res) => {
      const userInfo = req.body;

      const token = jwt.sign(userInfo, process.env.JWT_ACCESS_SECRET, {
        expiresIn: "2h",
      });

      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
      });

      res.send({ success: true });
    });

    //------ jobs related apis -------//

    // only can get all users jobs post not individuals.

    /* app.get("/jobs", async (req, res) => {
      const result = await jobCollection.find().toArray();
      res.send(result);
    }); */

    // after modify (you can get all jobs or specific users jobs through query from url)

    app.get("/jobs", async (req, res) => {
      const email = req.query.email;
      const query = {};
      if (email) {
        query.hr_email = email;
      }

      const result = await jobCollection.find(query).toArray();
      res.send(result);
    });

    //could be done but should not be done.
    // app.get("/jobsByEmailAddress", async (req, res) => {
    //   const email = req.query.email;
    //   const query = { hr_email: email };
    //   const result = await jobCollection.find(query).toArray();
    //   res.send(result);
    // });

    //show the no of application deposited for each job posted by specific recruiter (in mongodb you can access any collection to other collection)

    app.get("/jobs/applications",verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { hr_email: email };
      const jobs = await jobCollection.find(query).toArray();

      // should use aggregate to have uptimum query

      for (job of jobs) {
        const applicationQuery = { jobId: job._id.toString() };
        const application_count =
          await applicationCollection.countDocuments(applicationQuery);
        job.application_count = application_count;
      }
      res.send(jobs);
    });

    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.findOne(query);
      res.send(result);
    });

    app.post("/jobs", async (req, res) => {
      const newJob = req.body;
      const result = await jobCollection.insertOne(newJob);
      res.send(result);
    });

    //---   application for job related apis---//

    //previous get api

    /* (app.get("/applications", async (req, res) => {
      const email = req.query.email;
      const query = {
        applicantEmail: email,
      };
      const result = await applicationCollection.find(query).toArray();
      res.send(result);
    });) */

    //to get all users applications or individuals
    /* app.get("/applications", async (req, res) => {
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
    }); */

    app.get("/applications", logger,verifyToken, async (req, res) => {
      const email = req.query.email;

      const query = {};

      if (email) {
        query.applicantEmail = email;
      }

      const result = await applicationCollection.find(query).toArray();

      // enrich application data with job info
      for (const application of result) {
        const jobId = application.jobId;

        const jobquery = {
          _id: new ObjectId(jobId),
        };

        const job = await jobCollection.findOne(jobquery);

        if (job) {
          application.company = job.company;
          application.title = job.title;
          application.company_logo = job.company_logo;
        }
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

    // get applicant details for each job posted by recruiter

    /*  app.get('/applications/:id',async(req,res)=>{
            not this way!
    }) */

    app.get("/applications/job/:job_id", async (req, res) => {
      const job_id = req.params.job_id;
      console.log(job_id);
      const query = { jobId: job_id };
      const result = await applicationCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/applications", async (req, res) => {
      const application = req.body;
      const result = await applicationCollection.insertOne(application);
      res.send(result);
    });

    // update the status of application by recruiter(initially there was no element like status in applicants table)
    app.patch("/applications/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: req.body.status,
        },
      };
      const result = await applicationCollection.updateOne(filter, updatedDoc);
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
