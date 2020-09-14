
/** @module VimeoDownloader */

import axios from 'axios';
import fs from 'fs';


export default class VimeoDownloader {

	/**
	 * The default quality for the downloaded videos
	 * @type {Number}
	 */
	static DEFAULT_MAX_QUALITY = 2160;

	/**
	 * The default progress callback
	 * @type   {Function}
	 * @param  {Object} event The progress event
	 */
	static DEFAULT_PROGRESS_CALLBACK = event => {}

	/**
	 * Construct the VimeoDownloader class
	 * @param  {Object}   options                  The list of options
	 * @param  {String}   options.maxQuality       The maximum quality to download videos at
	 * @param  {Function} options.progressCallback A method that is called on video download progress
	 */
	constructor(options = {}) {
		this.referer = options.referer || '';
		this.maxQuality = options.maxQuality || this.constructor.DEFAULT_MAX_QUALITY;
		this.progressCallback = options.progressCallback || this.constructor.DEFAULT_PROGRESS_CALLBACK;
	}

	/**
	 * Download a vimeo video
	 * @param  {String}  videoUrl        The embed URL of the vimeo video
	 * @param  {String}  targetFile      The target download file name of the video
	 * @param  {String}  targetDirectory The target download directory of the video
	 * @param  {Boolean} force           Forces the video to download even if it already exists locally
	 * @return {Promise}                 A promise that resolves when the video finishes downloading
	 */
	async download(videoUrl, targetFile, targetDirectory, force = false) {
		return new Promise(async (resolve, reject) => {
			let directVideoURL = await this.getDownloadURL(videoUrl);

			let response = await axios.get(directVideoURL, {
				headers: { referer: this.referer },
				responseType: 'stream'
			});

			let extension = response.headers['content-type'].split('/')[1];
			let fileSize = +response.headers['content-length'];
			let fileName = `${targetFile}.${extension}`.replace('/', '\:');
			let filePath = `${targetDirectory}/${fileName}`;
			
			let progressEvent = {
				skipped: false,
				downloaded: 0,
				fileSize,
				fileName,
				filePath
			};

			// Skip if the video already exists
			if (await this.fileExists(filePath, fileSize) && !force) {
				this.progressCallback({
					...progressEvent,
					skipped: true,
					downloaded: fileSize
				});
				return resolve(); 
			}

			// Download the file
			let writeStream = fs.createWriteStream(filePath);	
			writeStream.on('finish', resolve);
			writeStream.on('error', function(error) {
				throw error;
			});

			response.data.on('data', event => {
				this.progressCallback({
					...progressEvent,
					downloaded: event.length
				});
			});
			response.data.pipe(writeStream);
		});
	}

	/**
	 * Get the downloadable url of a vimeo video
	 * @param  {String} videoUrl The embed URL of a vimeo video
	 * @return {String}          The download URL of the video
	 */
	async getDownloadURL(videoUrl) {
		// Get the raw page content
		let { data } = await axios.get(videoUrl, {
			headers: { referer: this.referer }
		});
		
		// Find the config object on the page and get the list of videos within
		let configString = data.match(/var config = (\{(.*)\})\; if/);
		let configParsed = JSON.parse(configString[1]);
		let videoList = configParsed.request.files.progressive;

		// Find the highest quality download url
		let downloadURL;
		videoList.reduce((highestQuality, video) => {
			if (video.height > highestQuality && video.height <= this.maxQuality) {
				downloadURL = video.url;
				return video.height;
			}
			return highestQuality;
		}, 0);

		return downloadURL;
	}

	/**
	 * Check if a file already exists
	 * @param  {String} path The path to the file
	 * @param  {Number} size The size of the file in bytes
	 * @return {Boolean}
	 */
	async fileExists(path, size) {
		try {
			let fileData = await fs.promises.stat(path);
			return fileData.size === size;
		} catch (error) {
			return false;
		}
	}
}
