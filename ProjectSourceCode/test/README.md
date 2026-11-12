<!-- Record setup commands, route contract, and cleanup behavior -->
# Naxos - Automated Testing

## Overview
This project uses Mocha, Chai, and Chai HTTP to test registration validation and HTTP routes. The tests include unit tests and integration tests.   

## Running the tests
From the ProjectSourceCode directory:   
1. Install dependencies: npm install
2. Start the isolated PostgreSQL test database: docker compose -f docker-compose.test.yaml up -d
3. Run the automated tests: npm test
4. Run npm test a second time to verify that the tests can run more than once.

## Unit tests
Located in test/validation.spec.js. These tests check the validateRegistration() function without using Express or PostgreSQL   
Expected results:   
- Passwords shorter than eight characters are rejected 
- Mismatched passwords are rejected 
- Valid registration info is accepted 

## Integration tests 
Located in test/server.spec.js. These tests send HTTP requests to the Express application.   
Expected results: 
- GET / returns HTTP 200 
- POST /register with valid information returns HTTP 200, displays a success message, and creates a user in the database
- POST /register with mismatched passwords returns HTTP 200, displays an error message, and doesn't create a user 

## Test Database 
Integration tests us a separate PostgreSQL database named fashion_agent_test, exposed on port 5433. The test environment is configured in test/setup.js, and the database container is defined in docker-compose.test.yaml. The tests use a dedicated test username and remove that user before and after testing. This prevents the registration tests from modifying the normal development database.  

## Cleanup 
To stop and remove the test database container, run: docker compose -f docker-compose.test.yaml down   
The test database uses temporary storage, so its contents are discard when the container is removed.  

## Test Repeatability   
Running npm test multiple times should produce the same passing results without requiring manual database cleanup. 