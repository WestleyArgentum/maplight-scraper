
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

        console.log()
        cb(versionedBills);
    });
}

billsFromMaplightData("MapLight_112thBills 20140822.csv", downloadBills);


function downloadBills(versionedBills) {
    var currTimeout = 0;
    var num = 0;
    for (var actionId in versionedBills) {
        if (!versionedBills.hasOwnProperty(actionId)) {
            continue;
        }

        var bill = versionedBills[actionId];
        var outFile = '' + bill['session'] + '-' + bill['prefix'] + '-' + bill['num'] + '-' + actionId + '.csv'

        if (fs.existsSync(outFile)) {
            continue;
        }

        setTimeout(downloadBill, currTimeout, bill['session'], bill['prefix'], bill['num'], actionId, outFile);
        currTimeout += 1000 * 15;
        num += 1;
    }

    console.log('Downloading ', num, 'bills...')
}


function downloadBill(session, prefix, num, actionId, outFile) {
    console.log('Starting bill ' + prefix + ' ' + num + ' ' + actionId);

    var req = 'http://maplight.org/us-congress/bill/' + session + '-' + prefix + '-' + num + '/' + actionId + '/download.csv';
    request(req).pipe(fs.createWriteStream(outFile));
}
