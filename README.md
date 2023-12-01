# SimplyBook.me CSV Booking Importer
This project is a JavaScript-based application designed to import bookings from a CSV file into the SimplyBook.me system.  

The application uses jQuery for DOM manipulation and AJAX requests. It interacts with the SimplyBook.me API to authenticate, refresh tokens, search for clients, create new clients, and make bookings.  

The application is divided into four steps:  
* User authentication: The user is required to sign in using their company login, user login, and password.  
* CSV file upload: The user uploads a CSV file containing the booking data. The file is parsed into a JavaScript object.  
* Field selection: The user selects the required fields from the parsed CSV data. The application checks if all required fields are selected before proceeding.  
* Data import: The application imports the data into the SimplyBook.me system. It searches for existing clients or creates new ones if necessary, and then makes bookings based on the provided data. The progress of the import is displayed to the user.  

The application also handles errors and displays appropriate messages to the user. It stores the login data in the local storage for convenience.
