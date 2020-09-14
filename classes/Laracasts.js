
/** @module Laracasts */

import querystring from 'querystring';
import puppeteer from 'puppeteer';
import jsdom from 'jsdom';
const { JSDOM } = jsdom;


export default class Laracasts {

	/**
	 * Construct the Laracasts class
	 */
	constructor() {
		this.browser = null;
		this.page = null;
	}

	/**
	 * Makes a POST request to the puppeteer page instance
	 * @param  {String} url  The url to send the POST request to
	 * @param  {Object} data The data to send 
	 */
	async pagePostRequest(url, data) {
		await this.page.setRequestInterception(true);
		this.page.once('request', request => {
			request.continue({
				'method': 'POST',
				'postData': querystring.stringify(data),
				'headers': {
					...request.headers(),
					'Content-Type': 'application/x-www-form-urlencoded'
				},
			});
			this.page.setRequestInterception(false);
		});

		await this.page.goto(url);
	}

	/**
	 * Login to the laracasts website
	 * @param  {String} email    The email used for the laracasts account
	 * @param  {String} password The password used for the laracasts account
	 */
	async login(email, password) {
		this.browser = await puppeteer.launch();
		this.page = await this.browser.newPage();

		await this.page.goto('https://laracasts.com/login', { waitUntil: 'networkidle0' });
		let token = await this.page.$eval('input[name=_token]', el => el.value);

		await this.pagePostRequest('https://laracasts.com/sessions', {
			email,
			password,
			_token: token,
			remember: 1
		});	
	}

	/**
	 * Finds the requested elements on a page and returns them within an array
	 * @param  {String} url    The url of the page
	 * @param  {String} query  The query selector string to locate the elements
	 * @return {Array}         An array containing the requested elements
	 */
	async getElements(url, query) {
		await this.page.goto(url, { waitUntil: 'networkidle0' });
		let dom = new JSDOM(await this.page.content());
		return [...dom.window.document.querySelectorAll(query)];
	}

	/**
	 * Get all the available topics
	 * @return {Array} A list of the available topics
	 */
	async getTopics() {
		let topicsUrl = 'https://laracasts.com/browse/all';
		let topicSelector = `[href^='https://laracasts.com/topics/']`;
		let topicAnchors = await this.getElements(topicsUrl, topicSelector);

		return topicAnchors.map(anchor => {
			return {
				title: anchor.querySelector('h2').textContent,
				slug: anchor.href.match(/([^\/]*)\/*$/)[1],
				url: anchor.href
			}
		});
	}

	/**
	 * Get all the available series within a topic
	 * @param  {Object} topic The topic to get the series for
	 * @return {Array}        A list of the available series
	 */
	async getSeries(topic) {
		let seriesSelector = 'a:not([class])[href^="/series/"]';
		let seriesAnchors = await this.getElements(topic.url, seriesSelector);

		return seriesAnchors.map(anchor => {
			return {
				title: anchor.textContent.trim(),
				slug: anchor.href.match(/([^\/]*)\/*$/)[1],
				url: 'https://laracasts.com' + anchor.getAttribute('href', 2),
				topic
			}
		});
	}

	/**
	 * Get all the available episodes within a topic
	 * @param  {Object} series The series to get the episodes for
	 * @return {Array}         A list of the available episodes
	 */
	async getEpisodes(series) {
		let episodeSelector = `h4 > a[href^='/series/${series.slug}/episodes/']`;
		let episodeAnchors = await this.getElements(series.url, episodeSelector);

		return episodeAnchors.map(anchor => {
			return {
				title: anchor.title,
				id: anchor.href.match(/([^\/]*)\/*$/)[1],
				url: 'https://laracasts.com' + anchor.href,
				series
			}
		});
	}

	/**
	 * Gets the embed vimeo video link for an episode
	 * @param  {Object} episode The episode to get the video of
	 * @return {String}         The vimeo video link for the episode
	 */
	async getEpisodeVideo(episode) {
		await this.page.goto(episode.url, { waitUntil: 'networkidle0' });
		try {
			return await this.page.$eval('iframe[src*="player.vimeo.com"]', el => el.src);
		} catch (error) {
			throw new Error('Failed to find episode video, please make sure your login credentials are correct.');
		}
	}

}
