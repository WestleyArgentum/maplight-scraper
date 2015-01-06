
var fs = require('fs'),
    request = require('request'),
    cheerio = require('cheerio'),
    csv = require('csv');

var BILL_PREFIX_MAPPINGS = {
    'H': 'hr',
    'HC': 'hconres',
    'HJ': 'hjres',
    'HR': 'hres',
    'S': 's',
    'SC': 'sconres',
    'SJ': 'sjres',
    'SR': 'sres'
};


function billsFromMaplightData(file, cb) {
    var raw = fs.readFileSync(file);
    csv.parse(raw.toString(), function(err, data) {
        var versionedBills = {};
        for (var i = 1; i < data.length; ++i) {
            var actionId = data[i][2];

            if (!(actionId in versionedBills)) {
                var bill = data[i][0].split(' ');
                versionedBills[actionId] = {
                    'session': parseInt(data[i][3]),
                    'prefix': BILL_PREFIX_MAPPINGS[bill[0]],
                    'num': bill[1]
                };
            }
        }

        console.log('Versioned Bills:', versionedBills);
        cb(versionedBills);
    });
}

function downloadBillDescriptions(versionedBills) {
    var currTimeout = 0;
    var num = 0;
    for (var actionId in versionedBills) {
        if (!versionedBills.hasOwnProperty(actionId)) {
            continue;
        }

        var bill = versionedBills[actionId];
        var outFile = '' + bill['session'] + '-' + bill['prefix'] + '-' + bill['num'] + '-' + actionId + '-description.json'

        if (fs.existsSync(outFile)) {
            continue;
        }

        setTimeout(downloadBillDescription, currTimeout, bill['session'], bill['prefix'], bill['num'], actionId, outFile);
        currTimeout += 1000 * 4;
        num += 1;
    }

    console.log('Downloading ', num, 'bill descriptions...')
}

function downloadBillDescription(session, prefix, num, actionId, outFile) {
    console.log('Downloading description ' + prefix + ' ' + num + ' ' + actionId);

    var req = 'http://maplight.org/us-congress/bill/' + session + '-' + prefix + '-' + num + '/' + actionId + '/total-contributions/';
    request(req, function (error, response, html) {
        if (!error && response.statusCode == 200) {
            var $ = cheerio.load(html);

            var actionDescription = $('#map-bill-header-vote > strong').text().toUpperCase(),
                actionResult = $('#map-bill-header-vote .vote-details:first-of-type').text().toUpperCase(),
                introductionDate = $('#map-bill-history .odd:first-of-type').first().text().replace('Introduced', ''),
                houseVoteOnPassage = 'House Vote:On Passage'.toUpperCase(),
                senateVoteOnPassage = 'Senate Vote:On Passage'.toUpperCase(),
                didNotPass = 'DID NOT PASS'.toUpperCase(),
                didPass = 'PASSED'.toUpperCase(),
                totalMoneyFor = $('#total-contributions-graph .graph .map-yes-block .total').text().replace(/\$|,/g, ''),
                totalMoneyAgainst = $('#total-contributions-graph .graph .map-no-block .total').text().replace(/\$|,/g, ''),
                congress,
                action,
                passed,
                dateIntroduced,
                dateVote;

            if (actionDescription.indexOf(houseVoteOnPassage) != -1) {
                congress = 'house';
                action = 'passage';
            } else if (actionDescription.indexOf(senateVoteOnPassage) != -1) {
                congress = 'senate';
                action = 'passage';
            } else {
                action = 'amendment';
            }

            if (actionResult.indexOf(didNotPass) != -1) {
                passed = false;
                dateVote = Date.parse(actionResult);
            } else if (actionResult.indexOf(didPass) != -1) {
                passed = true;
                dateVote = Date.parse(actionResult);
            }

            dateIntroduced = Date.parse(introductionDate);

            var description = {
                'session': session,
                'prefix': prefix,
                'num': num,
                'actionId': actionId,
                'congress': congress,
                'action': action,
                'passed': passed,
                'dateIntroduced': dateIntroduced,
                'dateVote': dateVote,
                'money': {
                    'totalFor': totalMoneyFor,
                    'totalAgainst': totalMoneyAgainst
                }
            };

            fs.writeFileSync(outFile, JSON.stringify(description));

            console.log('>> ', outFile);
        }
    });
}

function downloadBillsContributions(versionedBills) {
    var currTimeout = 0;
    var num = 0;
    for (var actionId in versionedBills) {
        if (!versionedBills.hasOwnProperty(actionId)) {
            continue;
        }

        var bill = versionedBills[actionId];
        var outFile = '' + bill['session'] + '-' + bill['prefix'] + '-' + bill['num'] + '-' + actionId + '-contributions.csv'

        if (fs.existsSync(outFile)) {
            continue;
        }

        setTimeout(downloadBillContributions, currTimeout, bill['session'], bill['prefix'], bill['num'], actionId, outFile);
        currTimeout += 1000 * 8;
        num += 1;
    }

    console.log('Downloading ', num, 'bills contributions...')
}

function downloadBillContributions(session, prefix, num, actionId, outFile) {
    console.log('Downloading bill ' + prefix + ' ' + num + ' ' + actionId);

    var req = 'http://maplight.org/us-congress/bill/' + session + '-' + prefix + '-' + num + '/' + actionId + '/download.csv';
    request(req).pipe(fs.createWriteStream(outFile));
}

bulk_filepath = process.argv[2];
if (!fs.existsSync(bulk_filepath)) {
    console.log('Error reading bulk data file. The first argument to this script should be a path to bulk maplight data.' +
        ' See `maplight-scraper/maplight-data/`');
    return;
}

data_type = process.argv[3] || 'descriptions';
downloader_fn = data_type == 'descriptions' ? downloadBillDescriptions : downloadBillsContributions;

billsFromMaplightData(bulk_filepath, downloader_fn);
