require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const apicache = require('apicache');

const URL_BASE = process.env.URL_BASE;
const SECRET_KEY = process.env.SECRET_KEY;

const supabaseClient = createClient(URL_BASE, SECRET_KEY);
const app = express();

// Initialize cache with apicache
const cache = apicache.middleware;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

app.get([
    '/',
    '/name=:name/',
    '/name=:name/part=:part/',
    '/name=:name/season=:season/',
    '/name=:name/season=:season/episode=:episode/',
], async (req, res) => {
    const { name, season, episode, part } = req.params;
    let query = supabaseClient.from('movies').select();

    if (name) {

        if (season) {
            query = query.eq('season', season);

            if (episode) {
                try {
                    const { data: episodes, error } = await query.order('episode').select();

                    if (error) throw error;

                    const indexVariable = episodes.findIndex(d => d.episode == episode);
                    let prevUrl = '';
                    let nextUrl = '';

                    if (indexVariable > 0) {
                        const prevEpisode = episodes[indexVariable - 1].episode;
                        prevUrl = `/name=${name}/season=${season}/episode=${prevEpisode}/`;
                    }

                    if (indexVariable < episodes.length - 1) {
                        const nextEpisode = episodes[indexVariable + 1].episode;
                        nextUrl = `/name=${name}/season=${season}/episode=${nextEpisode}/`;
                    }

                    const url = episodes[indexVariable].link;
                    return res.render('video', { name, season, episode, url, prevUrl, nextUrl });

                } catch (error) {
                    return res.status(500).send(`Error: ${error.message}`);
                }
            } else {
                try {
                    const { data: episodes, error } = await query.select();

                    if (error) throw error;

                    const episodeNumbers = [...new Set(episodes.map(item => item.episode))].sort();
                    return res.render('episodes', { episodes: episodeNumbers, name, season });

                } catch (error) {
                    return res.status(500).send(`Error: ${error.message}`);
                }
            }
        }

        else if (part) {
            try {
                const { data: parts, error } = await query.order('part').select();
                if (error) throw error;

                const indexVariable = parts.findIndex(d => d.part == part);
                let prevUrl = '';
                let nextUrl = '';

                if (indexVariable > 0) {
                    const prevPart = parts[indexVariable - 1].part;
                    prevUrl = `/name=${name}/part=${prevPart}/`;
                }

                if (indexVariable < parts.length - 1) {
                    const nextPart = parts[indexVariable + 1].part;
                    nextUrl = `/name=${name}/part=${nextPart}/`;
                }

                const url = parts[indexVariable].link;
                return res.render('video', { name, part, url, prevUrl, nextUrl });

            } catch (error) {
                return res.status(500).send(`Error: ${error.message}`);
            }
        }

        try {
            query = query.eq("name", name);

            const { data, error } = await query.select();

            if (error) throw error;

            const seasons = [...new Set(data.map(item => item.season))].filter(season => season !== null)
                .sort();

            if (seasons.length > 0) {
                return res.render('seasons', { seasons, name });
            }

            const parts = [...new Set(data.map(item => item.part))].sort();
            return res.render('parts', { parts, name });

        } catch (error) {
            return res.status(500).send(`Error: ${error.message}`);
        }
    }

    try {
        const { data, error } = await query.select();

        if (error) throw error;

        const names = [...new Set(data.map(item => item.name))].sort();
        return res.render('index', { names });

    } catch (error) {
        return res.status(500).send(`Error: ${error.message}`);
    }
});

app.listen(3000, () => {
    console.log(`Server is running on port 3000`);
});
