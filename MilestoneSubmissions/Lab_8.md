# CSCI 3308 — Lab 8 Project Proposal

> **Project:** Fashion App / Digital Closet  
> **Team Number:** 013-5
> **Lab Instructions:** https://cuboulder-csci3308.pages.dev/docs/labs/lab8  
> **Project Guide:** https://cuboulder-csci3308.pages.dev/docs/project

## 1. Team Number

013-5

## 2. Team Name

Git Dressed 

## 3. Team Members

| Team Member | Email | Username |
| --- | --- | --- |
| Prisha Goyal | prisha.goyal@colorado.edu | PGoyal224 |
| Jaden Cohavi | jaden.cohavi@colorado.edu | Jadencoh |
| Ethan Guirguis | ethan.guirguis@colorado.edu | etexcelebt |
| Sofia Antal | sofia.antal@colorado.edu | soan1217 |
| Aryan Choudhary | arch9012@colorado.edu | AryanFlick |


## 4. Application Name

Naxos

Meaning: We based the name of our app off the Greek myth of Ariadne’s thread. Ariadne gave Theseus a magical ball of yarn to help him escape the labyrinth after he slayed the Minotaur. After his success in leaving the maze, he ultimately left Ariadne on the island of Naxos. Our app Naxos is where the users will find themselves after they have successfully navigated the maze of their closets and emerge with a new system of organization. 

## 5. Application Description

> **Required:** Write **2–3 paragraphs** describing the application, its functionality, its value to users, and the planned scope. The prompts below are guidance, not finalized commitments.

**Paragraph 1 — Problem and concept:**  
[Describe the difficulty of keeping track of clothing and planning outfits. Explain what the digital closet application does.]

**Paragraph 2 — Core functionality:**  
[Describe the features your team actually agrees to build. Potential examples: add clothing items; categorize and view saved items; build outfits from saved items; edit or delete clothing items; save outfits. Do not promise unapproved features.]

**Paragraph 3 — Value and realistic scope:**  
[Explain how the app will help users, what sets it apart, and which features are in scope for the four-week project. Identify any stretch goals separately if relevant.]

### Proposed Feature Scope (planning aid)

| Feature | MVP or stretch? | Owner | Notes |
| --- | --- | --- | --- |
| [Add clothing item] | [Decide] | [TBD] | [TBD] |
| [View digital closet] | [Decide] | [TBD] | [TBD] |
| [Categorize/filter items] | [Decide] | [TBD] | [TBD] |
| [Edit clothing item] | [Decide] | [TBD] | [TBD] |
| [Delete clothing item] | [Decide] | [TBD] | [TBD] |
| [Create/save outfit] | [Decide] | [TBD] | [TBD] |
| [Other feature] | [Decide] | [TBD] | [TBD] |

## 6. Audience


Our target audience consists of people who want a more convenient way to organize their clothing and plan outfits. This includes people who have large wardrobes, struggle to decide what to wear, or want to experiment with different clothing combinations. Our ideal user is someone who regularly uses technology, owns a variety of clothing items, and wants to simplify the process of choosing outfits for different occasions, weather conditions, and personal styles.    
     
Our application aims to solve two problems: keeping track of clothing items and deciding what to wear. Users may forget about clothing they own, struggle to find combinations that work, or spend too much time planning outfits. Our application will address these problems by allowing users to catalogue their clothing and build outfits based on what they own.    
    
To make sure our application is accessible and effective, we plan to design a simple user interface with clearly labeled navigation, buttons, and forms. Users will be able to easily add clothing items, browse their inventory, and make outfits without needing extensive technical knowledge. Our goal is to make the application convenient and approachable for users with any level of technical experience. 

## 7. Vision Statement

For individuals who struggle with organizing their wardrobes and deciding what to wear, Naxos is a digital wardrobe management application that simplifies clothing organization and outfit planning while encouraging creativity and personal expression. Rather than relying on physical wardrobe organization or manually planning every outfit, Naxos provides a convenient platform for users to catalogue their clothing, create and save outfits, and discover new combinations using items they already own.

## 8. Version Control

- **Public GitHub repository URL:** https://github.com/PGoyal224/Group5-FashionAgent
- **Repository creator:** Prisha Goyal


### Required Repository Structure



```text
<repository-root>/
├── TeamMeetingLogs/
│   └── [Weekly TA meeting minutes — update the same file each week]
├── MilestoneSubmissions/
│   └── Lab_8.md
├── ProjectSourceCode/
│   ├── .gitignore
│   └── [Application source code and relevant documentation]
└── ReadMe.md
```



## 9. Development Methodology


To keep track of the work done over the next 4 weeks, we are using a Kanban Project Board on GitHub. The board can be found under the "Projects" tab in the repository, labeled "Team5-FashionAgentBoard."

## 10. Communication Plan

The team will communicate via Slack for planning and collaboration purposes. Additionally, we will use the GitHub Project Board to mark who is doing which tasks and the status of those tasks. 

## 11. Meeting Plan

### Regular Team Meetings

- **Day(s):** Tuesday, Thursday
- **Time(s):** Indeterminate, depends on schedules
- **Modality:** Group Video Calls

### Weekly TA Meetings

- **Day:** Monday
- **Time:** 6:00pm - 6:15pm
- **Meeting link:** https://cuboulder.zoom.us/j/5481730913
- **Meeting minutes owner:** Prisha Goyal
- **Where minutes are stored:** `TeamMeetingLogs/`

## 12. Use Case Diagram

<img src="./Lab8Assets/group_5_use_case_diagram.png" alt="Use Case Diagram" width="500">


## 13. Wireframes

### Guest Homepage
<img src="./Lab8Assets/group_5_guest_homepage_wireframe.png" alt="Guest Homepage Wireframe" width="300">

### User Homepage
<img src="./Lab8Assets/group_5_user_homepage_wireframe.png" alt="User Homepage Wireframe" width="300">

### Clothing Inventory
<img src="./Lab8Assets/group_5_my_Inventory_wireframe.png" alt="Clothing Inventory Wireframe" width="300">

### Add Clothing Item
<img src="./Lab8Assets/group_5_clothing_ item_wireframe.png" alt="Add Clothing Item Wireframe" width="300">

### Saved Outfits 
<img src="./Lab8Assets/group_5_my_outfits_wireframe.png" alt="Saved Outfits Wireframe" width="300">

### Build Outfit
<img src="./Lab8Assets/group_5_build _outfit_wireframe.png" alt="Build Outfit Wireframe" width="300">

---

## Extra Credit — Project Risk Analysis

### 1) Difficulty Implementing Outfit Generation
Severity: High   
We plan to add the ability to generate outfits based on user preferences. Implementing a system that consistently produces appropriate outfits may be more difficult than anticipated.   
Mitigation: We could start off by implementing a basic outfit generation system that uses clothing categories and user-defined tags to select compatible items. If time permits, we can make the system far more complicated to include more factors and more adherence to user preferences. 

### 2) Time Constraints and Project Scope
Severity: High   
If we underestimate the time required to implement all planned features, we could end up with an incomplete or half-baked application by the project deadline.   
Mitigation: We will prioritize essential functionality, including account creation, clothing inventory management, and basic outfit generation. More advanced features and polish will be implemented only after the basic functionality is complete. We could also establish deadlines to monitor our progress.

### 3) Database Design and Integration Issues
Severity: High   
Our application will require a database to store user accounts, clothing items, clothing attributes, and saved outfits. Poor database design or integration issues could cause problems when storing, retrieving, or updating this information.   
Mitigation: We will plan our database schema before beginning implementation and establish clear relationships between users, clothing items, and outfits. We will also test database operations throughout development to identify issues early.

### 4) Clothing Image Upload and Storage
Severity: Medium     
Users will need to upload images of their clothing items. Implementing image uploads and ensuring that images are stored and displayed correctly may introduce technical difficulties.  
Mitigation: We will research and test image upload and storage methods early in development. We will also establish restrictions on supported file types and sizes to reduce potential compatibility and storage issues.  

### 5) User Authentication and Data Security
Severity: High     
Our application will store user account information and personal clothing inventories. Security vulnerabilities could potentially allow unauthorized users to access or modify another user's information.   
Mitigation: We will use established authentication methods, securely hash user passwords, and ensure that users can only access clothing items and outfits associated with their own accounts. We will also test authentication and authorization functionality before deployment.  