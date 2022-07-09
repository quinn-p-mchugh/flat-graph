const core = require("@actions/core");
const github = require("@actions/github");
const fs = require("fs");
const neo4j = require("neo4j-driver");

const NEO4J_URI = core.getInput("neo4j-uri");
const NEO4J_USER = core.getInput("neo4j-user");
const NEO4J_PASSWORD = core.getInput("neo4j-password");
const FILENAME = core.getInput("filename");
const CYPHER_QUERY = core.getInput("cypher-query");
const CYPHER_RUN_METHOD = core.getInput("cypher-run-method");
const APOC_ITERATE_CYPHER_ITERATE = core.getInput("apoc-iterate-cypherIterate");
const APOC_ITERATE_CYPHER_ACTION = core.getInput("apoc-iterate-cypherAction");
const APOC_ITERATE_BATCH_SIZE = core.getInput("apoc-iterate-batchSize");

const driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
);

const loadData = async () => {
  const session = driver.session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    const jsonData = JSON.parse(fs.readFileSync(FILENAME));

    switch (CYPHER_RUN_METHOD) {
      case "apoc.periodic.iterate": {
        let query = `CALL apoc.periodic.iterate(
          '${APOC_ITERATE_CYPHER_ITERATE}',
          '${APOC_ITERATE_CYPHER_ACTION}',
          {batchSize: $batchSize, parallel: false, params: {value: $value}}
          )`;
        const tx = session.beginTransaction();
        const result = await tx.run(query, {
          value: jsonData,
          batchSize: APOC_ITERATE_BATCH_SIZE,
        });
        result.records.forEach((record) => console.log(record));
        await tx.commit();
      }
      case "tx.run": {
        const tx = session.beginTransaction();
        const result = await tx.run(CYPHER_QUERY, { value: jsonData });
        result.records.forEach((record) => console.log(record));
        await tx.commit();
      }
    }
  } catch (error) {
    core.setFailed(error.message);
  } finally {
    await session.close();
    await driver.close();
  }
};

loadData();
