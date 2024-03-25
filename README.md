# Aditi's Email Support

Welcome to Aditi's Email Support, a web application that provides seamless email management solutions. Our platform integrates various functionalities such as authentication with Google OAuth 2.0, fetching user information, sending emails, and analyzing email content using OpenAI's advanced language models.

## Key Features

- **OAuth 2.0 Integration:** Securely authenticate users via Google OAuth 2.0 for accessing Gmail APIs.
- **Email Management:** Fetch user profile information, send emails, and generate AI-driven replies effortlessly.
- **OpenAI Integration:** Leverage OpenAI's language models to craft intelligent email responses.
- **RESTful API:** Well-defined RESTful API endpoints for seamless integration with other applications or services.

## Endpoints Overview

### Authentication with Google OAuth 2.0

- **Route:** `/auth/google`
- **Description:** Initiates the OAuth 2.0 authentication process with Google.

### Google OAuth 2.0 Callback Endpoint

- **Route:** `/auth/google/callback`
- **Description:** Handles callback after user authorization, facilitating secure access to user data.

### User Profile

- **Route:** `/mail/user/:email`
- **Description:** Retrieves information about a Gmail user based on their email address.

### Message List

- **Route:** `/mail/list/:email`
- **Description:** Retrieves a list of messages belonging to an authorized user's email account.

### Reading a Particular Email by ID

- **Route:** `/mail/read/:email/messages/:messageId`
- **Description:** Allows reading a specific email message identified by its unique message ID.

### Fetching Draft Emails

- **Route:** `/mail/drafts/:email`
- **Description:** Retrieves drafts of a specific email address, providing a JSON array of draft objects.

### Sending Emails

- **Route:** `/mail/sendemail`
- **Description:** Sends an email with specified sender and recipient addresses.

### Parsing and Replying via Email

- **Route:** `/mail/readdata/:messageId`
- **Description:** Parses an incoming email, extracts relevant information, and generates a suitable reply using OpenAI.

## Getting Started

To get started with Aditi's Email Support, follow these steps:

1. **Authentication:** Visit `/auth/google` to authenticate with Google OAuth 2.0.
2. **Access User Profile:** Use `/mail/user/:email` to fetch user profile information.
3. **Send Emails:** Utilize `/mail/sendemail` to send emails programmatically.
4. **Intelligent Replies:** Employ `/mail/readdata/:messageId` to generate AI-driven replies.

## Credentials
  - **Developer's Email:** `aditibhadoriya1333@gmail.com`
  - **User's Email:** `aditibhadoriya25@gmail.com`
  - These credentials can be used to Use The Application

## Deployed Link : [Link](https://aditi-s-email-support.onrender.com)
## Documentation : The Documentation can be found [here](https://documenter.getpostman.com/view/31955255/2sA35D4NaG)
 

## Conclusion

Aditi's Email Support simplifies email management tasks with its intuitive interface and robust backend functionality. Whether you're looking to send emails, analyze content, or generate intelligent responses, our platform has you covered.

Start managing your emails efficiently with Aditi's Email Support today!
