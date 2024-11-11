require('dotenv').config();
const express = require('express');
const oracledb = require('oracledb');
const https = require('https');
const fs = require('fs');


oracledb.initOracleClient({libDir: 'C:\\instantclient_21_13'});


const httpsOptions = {
  key: fs.readFileSync('certs_ustp/certs/ustp.co.id.key'),
  cert: fs.readFileSync('certs_ustp/certs/serverCert.pem')
};

const app = express();
const port = process.env.PORT || 3000;


app.use(express.json());

// Endpoint 
app.get('/api/optphmaster', async (req, res) => {
  let connection;
  const { query } = req.query; 

  try {
    
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

    
    const result = await connection.execute(
      sql,
      binds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    
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


/**
 * PATCH /api/optphmaster/:tphcode
 * Update the SERIALNUM column with the provided NFCID for a specific TPHCODE.
 */
app.patch('/api/optphmaster/:tphcode', async (req, res) => {
  let connection;
  const { tphcode } = req.params;
  const { nfcId } = req.body;

  // Input validation
  if (!tphcode || !nfcId) {
    return res.status(400).json({ error: 'TPHCODE and nfcId are required.' });
  }

  try {
    connection = await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectionString: process.env.DB_CONNECTION_STRING,
    });

    // Check if the record exists
    const checkSql = `SELECT SERIALNUM FROM OPTPHMASTER WHERE TPHCODE = :tphcode`;
    const checkResult = await connection.execute(
      checkSql,
      { tphcode },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found.' });
    }

    // Update the SERIALNUM column
    const updateSql = `UPDATE OPTPHMASTER SET SERIALNUM = :nfcId WHERE TPHCODE = :tphcode`;
    const updateResult = await connection.execute(
      updateSql,
      { nfcId, tphcode },
      { autoCommit: true }
    );

    res.json({ message: 'SERIALNUM updated successfully.', rowsAffected: updateResult.rowsAffected });
  } catch (err) {
    console.error('Error updating SERIALNUM:', err);
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

// Create HTTPS server
const httpsServer = https.createServer(httpsOptions, app);

// Start the HTTPS server
httpsServer.listen(port, '0.0.0.0', () => {
  console.log(`HTTPS Server is running on port ${port}`);
});

// Optional: Redirect HTTP to HTTPS
// If you want to redirect HTTP traffic to HTTPS, uncomment and modify the following:
/*
const http = require('http');
const httpPort = 80;

http.createServer((req, res) => {
  res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
  res.end();
}).listen(httpPort, () => {
  console.log(`HTTP redirect server running on port ${httpPort}`);
});
*/