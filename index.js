// index.js
require('dotenv').config();
const express = require('express');
const oracledb = require('oracledb');

let fs = require('fs')

oracledb.initOracleClient({libDir: 'C:\\instantclient_21_13'});

let pvKey = fs.readFileSync('certs_ustp/certs/ustp.co.id.key')
let cert = fs.readFileSync('certs_ustp/certs/serverCert.key')


const port = process.env.PORT || 3000;

// Middleware to handle JSON responses
app.use(express.json());

// Endpoint to fetch data from OPTPHMASTER with optional fuzzy search
app.get('/api/optphmaster', async (req, res) => {
  let connection;
  const { query } = req.query; // Extract 'query' parameter

  try {
    // Establish connection to Oracle DB
    connection = await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectionString: process.env.DB_CONNECTION_STRING,
    });

    let sql = `SELECT TPHCODE, TPHDESCRIPTION, BLOCKID FROM OPTPHMASTER`;
    let binds = [];

    if (query) {
      sql += ` WHERE TPHCODE LIKE :search OR TPHDESCRIPTION LIKE :search`;
      binds = { search: `%${query}%` };
    }

    // Execute the query
    const result = await connection.execute(
      sql,
      binds, // bind variables
      { outFormat: oracledb.OUT_FORMAT_OBJECT } // return as objects
    );

    // Send the result as JSON
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching data:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
