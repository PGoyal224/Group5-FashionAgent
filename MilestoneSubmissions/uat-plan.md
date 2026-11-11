# User Acceptance Testing - Lab 10

## Scope
The following features of the Naxos application will be tested:    
1. User Registration: Users can create accounts with valid usernames and passwords.   
2. Clothing Inventory: Logged-in users can add clothing items to their personal inventory.    
3. Outfit Creation: Logged-in users can create and save outfits using clothing from their inventory.   


## Testing Environment
Environment: Localhost, using Docker Compose    
URL: http://localhost:3000    
Browser: Google Chrome    
Database: PostgreSQL    
Setup: Clone the repository, configure the .env file, run npm install and docker compose up from ProjectSourceCode.   

## Testers
Member of our project team and other students will test the Naxos application. Testers will follow the provided test cases and record whether each feature works as expected.   

## Tests
| Test ID | Feature | AcceptanceCriterion | Preconditions | Test data | User steps | Expected Result | Tester ID | Actual result | Status | Issue / follow-up |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UAT-01 | Registration | Valid registration creates an account and displays confirmation. | Registration page is open; user is signed out; username uat_user01 is not already registered | username uat_user01; password testpassword | 1. Navigate to /register <br> 2. Enter the test username <br> 3. Enter and confirm the test password <br> 4. Click the registration button | Registration succeeds and the user sees a success message | TBD | Not run | Not run | None yet |
| UAT-02 | Registration | Duplicate usernames are rejected with clear feedback | The account uat_user01 already exists; tester is signed out | username uat_user01; password wrongtestpassword | 1. Navigate to /register <br> 2. Enter the existing username <br> 3. Enter and confirm the new password <br> 4. Click the registration button | Registration is rejected, and the user sees a message explaining that the username is already taken. | TBD | Not run | Not run | None yet |
| UAT-03 | Clothing Inventory | Users can add and view clothing items | Tester is logged in and can access their inventory | item name: Blue T-shirt; Category: top; Style: casual; | 1. Open the clothing inventory <br> 2. Select the option to add clothing item <br> 3. Enter the test item's info <br> 4. Save the item <br> 5. Return to inventory | The Blue T-shirt appears in the inventory with the saved information | TBD | Not run | Not run | None yet |
| UAT-04 | Clothing Inventory | Required clothing information must be provided | Tester is logged in and can access their inventory | item name: blank; Category: blank; Style: blank; | 1. Open the clothing inventory <br> 2. Select the option to add clothing item <br> 3. Enter the test item's info <br> 4. Attempt to save the item | The item is not saved and the user receives feedback indicating that required info is missing. | TBD | Not run | Not run | None yet |
| UAT-05 | Outfit Creation | Users can create and save outfits | Tester is logged in and has at least two clothing items in their inventory | Outfit name: Casual Outfit; Clothing: Any two pieces of clothing; | 1. Open the outfit creation page <br> 2. Select the clothing items to use <br> 3. Enter the outfit name <br> 4. Save the outfit <br> 5. Navigate to saved outfits. | The Casual Outfit appears in the collection and contains the selected clothing | TBD | Not run | Not run | None yet |
| UAT-06 | Outfit Creation | An outfit cannot be saved without clothing | Tester is logged in and can access the outfit creationg page | Outfit name: Empty Outfit; Clothing: none selected; | 1. Open the outfit creation page <br> 2. Enter the outfit name without selecting any clothing items <br> 3. Attempt to save the outfit | The empty outfit is not saved, and the user receives feedback explaining that clothing must be selected | TBD | Not run | Not run | None yet |