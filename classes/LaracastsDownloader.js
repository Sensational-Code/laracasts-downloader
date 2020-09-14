
/** @module LaracastsDownloader */

import Laracasts from './Laracasts.js';
import VideoDownloader from './VimeoDownloader.js';
import chalk from 'chalk';
import fs from 'fs';
import logUpdate from 'log-update';
import dotenv from 'dotenv';
dotenv.config();


export default class LaracastsDownloader {

	/**
	 * Construct the Downloader class
	 */
	constructor() {
		this.laracasts = new Laracasts();
		this.downloadPath = './laracasts';
	}

	/**
	 * Attempt to create the requested directory
	 * @param  {String} path     The path of the directory to create
	 * @return {Promise|Boolean} Returns an fs.mkdir promise if possible, false otherwise
	 */
	async createFolder(path) {
		try {
			return await fs.promises.mkdir(path);
		} catch (error) {
			return false;
		}
	}

	/**
	 * Download the entire laracasts video catalog
	 * @param  {String=} path The path to save the content to
	 */
	async download(path = this.downloadPath) {
		this.downloadPath = path;
		await this.laracasts.login(process.env.USERNAME, process.env.PASSWORD);
		await this.downloadTopics();
	}

	/**
	 * Download all the laracasts topics
	 */
	async downloadTopics() {
		let topics = await this.laracasts.getTopics();

		for (let topic of topics) {
			console.log('\n', 'Topic:', chalk.cyan(topic.title));
			await this.createFolder(`${this.downloadPath}/${topic.title}`);
			await this.downloadSeries(topic);
		}
	}

	/**
	 * Download all the laracasts series within a topic
	 * @param  {Object} topic The topic to download the series of
	 */
	async downloadSeries(topic) {
		let seriesList = await this.laracasts.getSeries(topic);

		for (let series of seriesList) {
			console.log('  ', 'Series:', chalk.blueBright(series.title));
			await this.createFolder(`${this.downloadPath}/${topic.title}/${series.title}`);
			await this.downloadEpisodes(series);
		}
	}

	/**
	 * Download all the laracasts episodes within a series
	 * @param  {Object} series The series to download the episodes of
	 */
	async downloadEpisodes(series) {
		let episodes = await this.laracasts.getEpisodes(series);

		for (let episode of episodes) {
			await this.downloadEpisodeVideo(episode, `${episode.id}. ${episode.title}`, `./laracasts/${series.topic.title}/${series.title}`);
		}
	}

	/**
	 * Download the video for a laracasts episode
	 * @param  {Object} episode The episode to download the video of
	 * @param  {String} name    The name to assign to the video locally
	 * @param  {String} path    The path to place the video file within
	 */
	async downloadEpisodeVideo(episode, name, path) {
		let percentDone = 0;
		let totalDownloaded = 0;

		let downloader = new VideoDownloader({
			referer: 'https://laracasts.com',
			progressCallback: event => {
				if (event.skipped) {
					logUpdate('    ' + `Skipping episode ${episode.id}: ${chalk.greenBright(episode.title)}`);
					return logUpdate.done();
				}

				if (percentDone === 100) {
					return logUpdate.done();
				}

				totalDownloaded += event.downloaded;
				percentDone = Math.round( (totalDownloaded / event.fileSize) * 100 );
				logUpdate('    ' + `Downloading episode ${episode.id}: ${chalk.greenBright(episode.title)} ${percentDone}%`);
			}
		});

		let videoURL = await this.laracasts.getEpisodeVideo(episode);
		await downloader.download(videoURL, name, path);
	}

}
