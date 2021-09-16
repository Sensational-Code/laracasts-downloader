# laracasts-downloader
Laracasts limits how many lesson videos you can download a day (currently 5).
This tool allows you to download every video from every course without a limit for those wanting to have them saved locally.  

**Disclaimer:**
This tool relies on web scraping and while works at the time of writing, may fail and need modification if laracasts updates their website structure.

## Install
Clone this repo to your local machine
```
git clone https://github.com/Sensational-Code/laracasts-downloader
```
Navigate into the project directory
```
cd laracasts-downloader
```
Install dependencies
```
npm install
```
Copy the `.env.example` and rename it `.env` within the project directory

Fill in the username and password fields within the `.env` file
```
USERNAME=yourusername@email.com
PASSWORD=yourpassword
```

## Usage
Ensure you are in the project directory and run the download script
```
npm run download
```
Wait for the download to complete (progress will be displayed in your terminal)

A `laracasts` folder will be created within the project directory with all the video content organized by course, lesson, and video order.
