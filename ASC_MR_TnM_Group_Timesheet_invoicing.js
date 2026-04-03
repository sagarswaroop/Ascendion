/**
** @NApiVersion 2.1
** @NScriptType MapReduceScript
** @NModuleScope SameAccount
*
** @libraries used:
                    
 
-- Date--      -- Modified By--      --Requested By--     --Description
DD-MM-YYYY        Employee Name         Client Name           One line description
 
*/
define(['N/search', 'N/record', 'N/runtime', 'N/query', 'N/format', "./Projects/Library/Project Library.js", "N/file"],
    function (search, record, runtime, query, format, lib, file) {
        function getInputData() {
            try {
                log.audit('getInputData', 'Start');
                var scriptObj = runtime.getCurrentScript();
                var deploymentID = scriptObj.deploymentId;
                log.debug('getInputData', 'Deployment Id: ' + deploymentID);
                var today = new Date();
                var formattedDate = format.format({
                    value: today,
                    type: format.Type.DATETIME,
                    timezone: 'America/New_York'
                })
                var sysdate = new Date(formattedDate);
                log.debug("getInputData:", " tempDate: " + sysdate + " : day is: " + sysdate.getDay());
                var day = sysdate.getDay();
                if (day == 0) {
                    day = 7;
                }

                var nsfrmDt = ('0' + (sysdate.getMonth() + 1)).slice(-2) + '/' +
                    ('0' + sysdate.getDate()).slice(-2) + '/' +
                    sysdate.getFullYear();

                log.debug("getInputData: Today's Day is: + nsfrmDt ", day + " " + nsfrmDt)

                var queryStr = ''
                if (deploymentID == 'customdeploy_asc_mr_timesheet_invoicing') {
                    // queryStr = "SELECT resourceAllocation.allocationResource AS employee,billng_info.custrecord_blng_cyle,job.ID,job.custentity_clb_bilcycle,job.customer,billng_info.custrecord_bln_strt_dte,billng_info.custrecord_blng_end_dte,job.custentity_clb_lastday,job.custentity_clb_projecttypeforinvoicing,job.parent,job.custentity_clb_missing_invoice_dates,resourceAllocation.startdate,resourceAllocation.enddate FROM job LEFT JOIN customrecord_clb_clientspecificbillingcy AS billng_info ON (billng_info.custrecord_blng_cyle = job.custentity_clb_bilcycle) LEFT JOIN resourceAllocation ON (job.id = resourceAllocation.project) WHERE (job.custentity_clb_projecttypeforinvoicing IN (1,2)) AND (job.custentity_clb_parentproject IS NULL) AND (job.custentity_clb_bilcycle IS NOT NULL) AND (resourceAllocation.startdate <= billng_info.custrecord_blng_end_dte AND resourceAllocation.enddate >= billng_info.custrecord_bln_strt_dte) AND job.id IN (51330,51684,51424)  AND billng_info.custrecord_bln_strt_dte >= '08/01/2023'"      
                    queryStr = "SELECT resourceAllocation.allocationResource AS employee,billng_info.custrecord_blng_cyle,job.ID,job.custentity_clb_bilcycle,job.customer,billng_info.custrecord_bln_strt_dte,billng_info.custrecord_blng_end_dte,job.custentity_clb_lastday,job.custentity_clb_projecttypeforinvoicing,job.parent,job.custentity_clb_missing_invoice_dates,resourceAllocation.startdate,resourceAllocation.enddate FROM job LEFT JOIN customrecord_clb_clientspecificbillingcy AS billng_info ON (billng_info.custrecord_blng_cyle = job.custentity_clb_bilcycle) LEFT JOIN resourceAllocation ON (job.id = resourceAllocation.project) WHERE (job.custentity_clb_projecttypeforinvoicing IN (1,2,3)) AND (job.custentity_clb_parentproject IS NULL) AND (job.custentity_clb_bilcycle IS NOT NULL) AND (billng_info.custrecord_blng_end_dte='" + nsfrmDt + "') AND (job.startdate<= '" + nsfrmDt + "' ) AND (job.custentity_clb_nst_lst_invc_dte < '" + nsfrmDt + "' OR job.custentity_clb_nst_lst_invc_dte IS NULL) AND (resourceAllocation.startdate <= billng_info.custrecord_blng_end_dte AND resourceAllocation.enddate >= billng_info.custrecord_bln_strt_dte)"
                    // queryStr = "SELECT resourceAllocation.allocationResource AS employee,billng_info.custrecord_blng_cyle,job.ID,job.custentity_clb_bilcycle,job.customer,billng_info.custrecord_bln_strt_dte,billng_info.custrecord_blng_end_dte,job.custentity_clb_lastday,job.custentity_clb_projecttypeforinvoicing,job.parent,job.custentity_clb_missing_invoice_dates,resourceAllocation.startdate,resourceAllocation.enddate FROM job LEFT JOIN customrecord_clb_clientspecificbillingcy AS billng_info ON (billng_info.custrecord_blng_cyle = job.custentity_clb_bilcycle) LEFT JOIN resourceAllocation ON (job.id = resourceAllocation.project) WHERE (job.custentity_clb_projecttypeforinvoicing IN (1,2)) AND (job.custentity_clb_parentproject IS NULL) AND (job.custentity_clb_bilcycle IS NOT NULL) AND (job.startdate<='04/09/2024' ) AND (resourceAllocation.startdate <= billng_info.custrecord_blng_end_dte AND resourceAllocation.enddate >= billng_info.custrecord_bln_strt_dte) AND job.ID IN (39457,58967,37042,70541,36897,37882,70545,39263,37163,36896,39447,37593,37834,37350,37220,37812,39087,37456,37518,59035,37313,37322,37000,58093,37242,37526,70561,37276,36930,37219,37567,38010,39579,39595,39607,39611,39659,37985,37418,37131,37899,37619,37878,37278,56409,37785,56431,39537,39531,70579,37123,70585,37095,39529,37768,37301,36805,39547,37679,37317,36947,39527,38015,39539,56518,45841,36929,39641,39309,37461,70595,37817,56541,56542,37240,39613,37569,37718,56605,37249,39627,37534,56617,56618,37266,56621,39555,37743,56637,56638,37855,37159,39585,56643,37459,56670,39669,39541,70603,37954,56680,37875,56688,39679,39543,37767,37700,39201,39473,37231,37071,37419,37515,37269,37842,39601,36860,37273,45852,39617,37927,36937) AND billng_info.custrecord_blng_end_dte <= '03/03/2024'";    
                    //queryStr = "SELECT resourceAllocation.allocationResource AS employee,billng_info.custrecord_blng_cyle,job.ID,job.custentity_clb_bilcycle,job.customer,billng_info.custrecord_bln_strt_dte,billng_info.custrecord_blng_end_dte,job.custentity_clb_lastday,job.custentity_clb_projecttypeforinvoicing,job.parent,job.custentity_clb_missing_invoice_dates,resourceAllocation.startdate,resourceAllocation.enddate FROM job LEFT JOIN customrecord_clb_clientspecificbillingcy AS billng_info ON (billng_info.custrecord_blng_cyle = job.custentity_clb_bilcycle) LEFT JOIN resourceAllocation ON (job.id = resourceAllocation.project) WHERE (job.custentity_clb_projecttypeforinvoicing IN (1,2)) AND (job.custentity_clb_parentproject IS NULL) AND (job.custentity_clb_bilcycle IS NOT NULL) AND (job.startdate<='04/09/2024' ) AND (resourceAllocation.startdate <= billng_info.custrecord_blng_end_dte AND resourceAllocation.enddate >= billng_info.custrecord_bln_strt_dte) AND job.ID IN (36984,36992,37050,37157,37241,37300,37519,37615,37750,37851,39037,39189,39255,39433,39435,39605,39637,39661,45850,56375,56415,56427,56462,56551,56611,69815,69816) AND billng_info.custrecord_blng_end_dte <= '03/03/2024'"
                    //queryStr = "SELECT resourceAllocation.allocationResource AS employee,billng_info.custrecord_blng_cyle,job.ID,job.custentity_clb_bilcycle,job.customer,billng_info.custrecord_bln_strt_dte,billng_info.custrecord_blng_end_dte,job.custentity_clb_lastday,job.custentity_clb_projecttypeforinvoicing,job.parent,job.custentity_clb_missing_invoice_dates,resourceAllocation.startdate,resourceAllocation.enddate FROM job LEFT JOIN customrecord_clb_clientspecificbillingcy AS billng_info ON (billng_info.custrecord_blng_cyle = job.custentity_clb_bilcycle) LEFT JOIN resourceAllocation ON (job.id = resourceAllocation.project) WHERE (job.custentity_clb_projecttypeforinvoicing IN (1,2)) AND (job.custentity_clb_parentproject IS NULL) AND (job.custentity_clb_bilcycle IS NOT NULL) AND (job.startdate<='04/09/2024' ) AND (resourceAllocation.startdate <= billng_info.custrecord_blng_end_dte AND resourceAllocation.enddate >= billng_info.custrecord_bln_strt_dte) AND job.ID IN (36703,36803,36804,36808,36809,36811,36817,36818,36819,36821,36822,36823,36824,36828,36830,36834,36835,36837,36838,36839,36845,36846,36848,36851,36852,36857,36860,36861,36863,36864,36867,36869,36870,36871,36872,36874,36878,36883,36884,36885,36886,36887,36888,36893,36895,36896,36898,36903,36905,36906,36908,36911,36913,36914,36916,36917,36919,36920,36921,36929,36930,36931,36934,36937,36941,36943,36947,36950,36957,36961,36962,36964,36967,36969,36971,36976,36978,36979,36980,36983,36984,36988,36991,36993,36995,36996,36998,37000,37001,37015,37017,37023,37030,37031,37037,37039,37042,37043,37046,37047,37050,37064,37066,37067,37070,37071,37073,37075,37078,37079,37085,37088,37090,37095,37099,37101,37104,37109,37115,37116,37124,37129,37131,37132,37133,37136,37138,37141,37144,37145,37147,37152,37153,37156,37163,37166,37167,37168,37170,37172,37180,37182,37189,37191,37199,37203,37206,37210,37212,37216,37219,37226,37227,37229,37231,37238,37239,37240,37242,37243,37248,37262,37269,37273,37274,37275,37276,37277,37282,37287,37313,37314,37317,37322,37326,37336,37337,37339,37340,37344,37345,37348,37352,37357,37359,37360,37362,37364,37368,37371,37372,37377,37378,37390,37392,37395,37400,37402,37413,37418,37419,37421,37428,37429,37433,37434,37435,37437,37440,37441,37444,37446,37450,37458,37459,37460,37464,37465,37466,37474,37476,37482,37483,37484,37490,37500,37501,37508,37510,37513,37515,37524,37526,37531,37532,37534,37535,37539,37540,37541,37544,37546,37558,37563,37566,37567,37569,37570,37577,37578,37580,37593,37602,37616,37622,37625,37630,37632,37634,37651,37657,37664,37670,37673,37682,37686,37688,37690,37691,37696,37700,37703,37710,37711,37713,37714,37718,37720,37724,37725,37727,37732,37734,37737,37742,37750,37752,37753,37757,37761,37762,37767,37768,37771,37774,37779,37782,37783,37785,37786,37787,37788,37792,37793,37798,37801,37805,37806,37808,37809,37810,37813,37817,37826,37833,37839,37841,37842,37845,37846,37850,37855,37856,37857,37861,37863,37864,37867,37874,37877,37878,37883,37885,37886,37887,37890,37892,37896,37899,37900,37903,37905,37908,37911,37916,37917,37923,37925,37926,37927,37938,37940,37944,37954,37955,37958,37960,37961,37964,37968,37969,37973,37977,37985,37990,37995,37997,37999,38008,38010,38019,39005,39015,39027,39037,39059,39125,39135,39151,39183,39185,39187,39189,39191,39193,39195,39231,39237,39239,39243,39249,39259,39261,39297,39303,39311,39313,39321,39323,39327,39331,39343,39347,39359,39367,39375,39377,39391,39395,39417,39427,39429,39431,39439,39467,39471,39481,39493,39499,39505,39507,39509,39511,39513,39515,39517,39525,39527,39529,39531,39539,39541,39543,39545,39547,39555,39563,39573,39575,39579,39585,39595,39607,39609,39611,39613,39615,39617,39621,39625,39629,39631,39633,39635,39641,39647,39649,39651,39655,39657,39667,39669,39671,39673,39675,39677,39683,45220,45824,45825,45827,45828,45829,45830,45833,45837,45839,45840,45841,45842,45846,45847,45849,45850,45852,48848,49547,50798,52110,56365,56366,56368,56369,56370,56371,56373,56374,56375,56376,56378,56379,56383,56387,56388,56392,56393,56394,56395,56396,56397,56398,56402,56403,56405,56411,56412,56413,56429,56430,56431,56432,56444,56448,56453,56454,56455,56462,56465,56466,56478,56480,56481,56487,56490,56494,56501,56509,56522,56528,56541,56545,56622,56637,56755,56756,58065,58069,58077,58085,58093,58101,58107,58117,58119,58121,58123,58147,58157,58159,58161,58163,58166,58171,58179,58183,58196,58204,58219,58243,58250,58254,58264,58266,58273,58275,58277,58281,58289,58293,58301,58305,58307,58311,58313,58315,58317,58319,58323,58337,58339,58349,58353,58355,58367,58377,58389,58403,58407,58411,58427,58433,58501,58525,58683,58695,58699,58703,58727,58741,58749,58767,58785,58787,58803,58807,58809,58839,58849,58901,58903,58905,58907,58909,58911,58913,58917,58921,58923,58925,58929,58931,58933,58937,58981,58983,58985,58989,58991,58993,58995,58997,58999,59001,59003,59005,59007,59009,59011,59013,59017,59019,59021,59023,59025,59035,59037,59087,59091,59093,59131,59141,59143,59187,69300,69811,69812,69813,69817,69818,69820,69821,69835,69836,69891,70545,70549,70559,70561,70563,76058,76358,76558,76560,76561,76562,76565,76568,76572,76573,76963,76964,77459,77559,77858,77859,77861,78159,78259,78560,78860,80167,80168,80169) AND billng_info.custrecord_blng_end_dte <= '04/13/2024'  AND billng_info.custrecord_blng_end_dte >= '12/23/2023'"
                } else if (deploymentID == 'customdeploy_asc_grp_ts_invoicing') {
                    //queryStr = "SELECT billng_info.custrecord_blng_cyle,job.ID,job.custentity_clb_bilcycle,job.customer,billng_info.custrecord_bln_strt_dte,billng_info.custrecord_blng_end_dte,job.custentity_clb_lastday,job.custentity_clb_projecttypeforinvoicing,job.parent,job.custentity_clb_missing_invoice_dates FROM job LEFT JOIN customrecord_clb_clientspecificbillingcy AS billng_info ON (billng_info.custrecord_blng_cyle = job.custentity_clb_bilcycle) WHERE (job.custentity_clb_projecttypeforinvoicing IN (4)) AND (job.custentity_clb_parentproject IS NULL) AND (job.custentity_clb_bilcycle IS NOT NULL) AND (billng_info.custrecord_blng_end_dte='"+nsfrmDt+"') AND (job.startdate<= '"+nsfrmDt+"' ) AND (job.custentity_clb_nst_lst_invc_dte < '"+nsfrmDt+"' OR job.custentity_clb_nst_lst_invc_dte IS NULL)";
                    queryStr = "SELECT billng_info.custrecord_blng_cyle,job.ID,job.custentity_clb_bilcycle,job.customer,billng_info.custrecord_bln_strt_dte,billng_info.custrecord_blng_end_dte,job.custentity_clb_lastday,job.custentity_clb_projecttypeforinvoicing,job.parent,job.custentity_clb_missing_invoice_dates FROM job LEFT JOIN customrecord_clb_clientspecificbillingcy AS billng_info ON (billng_info.custrecord_blng_cyle = job.custentity_clb_bilcycle) WHERE (job.custentity_clb_projecttypeforinvoicing IN (4)) AND (job.custentity_clb_parentproject IS NULL) AND (job.custentity_clb_bilcycle IS NOT NULL) AND (job.startdate<= '" + nsfrmDt + "' ) AND (job.custentity_clb_nst_lst_invc_dte < '" + nsfrmDt + "' OR job.custentity_clb_nst_lst_invc_dte IS NULL) AND (billng_info.custrecord_blng_end_dte='" + nsfrmDt + "') AND (billng_info.custrecord_blng_end_dte >= job.startdate)";
                    //queryStr = "SELECT billng_info.custrecord_blng_cyle,job.ID,job.custentity_clb_bilcycle,job.customer,billng_info.custrecord_bln_strt_dte,billng_info.custrecord_blng_end_dte,job.custentity_clb_lastday,job.custentity_clb_projecttypeforinvoicing,job.parent,job.custentity_clb_missing_invoice_dates FROM job LEFT JOIN customrecord_clb_clientspecificbillingcy AS billng_info ON (billng_info.custrecord_blng_cyle = job.custentity_clb_bilcycle) WHERE (job.custentity_clb_projecttypeforinvoicing IN (4)) AND (job.custentity_clb_parentproject IS NULL) AND (job.custentity_clb_bilcycle IS NOT NULL)  AND billng_info.custrecord_blng_end_dte <= '03/03/2024' AND (job.startdate<='04/09/2024' ) AND job.ID IN (46855,34171,33942,34127,34102,34134,33958,34113,33976,33960,34112,34170,34165,33904,34126,33940,69592,34123,34158,33954,34107,34105,34124,46857,34122,34176,34125,33956,34174,34138) AND (billng_info.custrecord_bln_strt_dte >= job.startdate)"
                    //queryStr = "SELECT billng_info.custrecord_blng_cyle,job.ID,job.custentity_clb_bilcycle,job.customer,billng_info.custrecord_bln_strt_dte,billng_info.custrecord_blng_end_dte,job.custentity_clb_lastday,job.custentity_clb_projecttypeforinvoicing,job.parent,job.custentity_clb_missing_invoice_dates FROM job LEFT JOIN customrecord_clb_clientspecificbillingcy AS billng_info ON (billng_info.custrecord_blng_cyle = job.custentity_clb_bilcycle) WHERE (job.custentity_clb_projecttypeforinvoicing IN (4)) AND (job.custentity_clb_parentproject IS NULL) AND (job.custentity_clb_bilcycle IS NOT NULL)  AND billng_info.custrecord_blng_end_dte <= '04/13/2024' AND (job.startdate<='04/09/2024' ) AND job.ID IN (33960,34112,46853,34131,34126,70429,64188,34140,34143,34155,34102,34145,33976,34113,34134,33996,33915,34141,34162,33954,33953,34147,33925,34142,34123,34165,69592,34146,34124,34135,34160,73156,46857,34115,34127,34129,48745,34163,34144,34122,34205,34159,33908,34154,34157,46944,34175,46855,69596,34128,34117,34153,34171,34176,34156,34136,34150,34170,34174,34158,34138) AND (billng_info.custrecord_bln_strt_dte >= job.startdate)"
                } else if (deploymentID == 'customdeploy_asc_mr_adhoc') {
                    //queryStr = "SELECT resourceAllocation.allocationResource AS employee,billng_info.custrecord_blng_cyle,job.ID,job.custentity_clb_bilcycle,job.customer,billng_info.custrecord_bln_strt_dte,billng_info.custrecord_blng_end_dte,job.custentity_clb_lastday,job.custentity_clb_projecttypeforinvoicing,job.parent,job.custentity_clb_missing_invoice_dates,resourceAllocation.startdate,resourceAllocation.enddate FROM job LEFT JOIN customrecord_clb_clientspecificbillingcy AS billng_info ON (billng_info.custrecord_blng_cyle = job.custentity_clb_bilcycle) LEFT JOIN resourceAllocation ON (job.id = resourceAllocation.project) WHERE (job.custentity_clb_projecttypeforinvoicing IN (1,2)) AND (job.custentity_clb_parentproject IS NULL) AND (job.custentity_clb_bilcycle IS NOT NULL) AND (job.startdate<='04/09/2024' ) AND (resourceAllocation.startdate <= billng_info.custrecord_blng_end_dte AND resourceAllocation.enddate >= billng_info.custrecord_bln_strt_dte) AND job.ID IN (37510) AND billng_info.custrecord_blng_end_dte = '03/31/2024'"
                    queryStr = "SELECT resourceAllocation.allocationResource AS employee,billng_info.custrecord_blng_cyle,job.ID,job.custentity_clb_bilcycle,job.customer,billng_info.custrecord_bln_strt_dte,billng_info.custrecord_blng_end_dte,job.custentity_clb_lastday,job.custentity_clb_projecttypeforinvoicing,job.parent,job.custentity_clb_missing_invoice_dates,resourceAllocation.startdate,resourceAllocation.enddate FROM job LEFT JOIN customrecord_clb_clientspecificbillingcy AS billng_info ON (billng_info.custrecord_blng_cyle = job.custentity_clb_bilcycle) LEFT JOIN resourceAllocation ON (job.id = resourceAllocation.project) WHERE (job.custentity_clb_projecttypeforinvoicing IN (1,2,3)) AND (job.custentity_clb_parentproject IS NULL) AND (job.custentity_clb_bilcycle IS NOT NULL) AND (billng_info.custrecord_blng_end_dte >='05/31/2024') AND (billng_info.custrecord_blng_end_dte <='06/13/2024') AND (job.startdate<= '06/13/2024' ) AND (resourceAllocation.startdate <= billng_info.custrecord_blng_end_dte AND resourceAllocation.enddate >= billng_info.custrecord_bln_strt_dte)";
                   // queryStr = "SELECT resourceAllocation.allocationResource AS employee,billng_info.custrecord_blng_cyle,job.ID,job.custentity_clb_bilcycle,job.customer,billng_info.custrecord_bln_strt_dte,billng_info.custrecord_blng_end_dte,job.custentity_clb_lastday,job.custentity_clb_projecttypeforinvoicing,job.parent,job.custentity_clb_missing_invoice_dates,resourceAllocation.startdate,resourceAllocation.enddate FROM job LEFT JOIN customrecord_clb_clientspecificbillingcy AS billng_info ON (billng_info.custrecord_blng_cyle = job.custentity_clb_bilcycle) LEFT JOIN resourceAllocation ON (job.id = resourceAllocation.project) WHERE (job.custentity_clb_projecttypeforinvoicing IN (1,2,3)) AND (job.custentity_clb_parentproject IS NULL) AND (job.custentity_clb_bilcycle IS NOT NULL) AND (billng_info.custrecord_blng_end_dte >='05/05/2023') AND (billng_info.custrecord_blng_end_dte <='11/29/2023') AND (job.startdate<= '05/26/2024' ) AND (resourceAllocation.startdate <= billng_info.custrecord_blng_end_dte AND resourceAllocation.enddate >= billng_info.custrecord_bln_strt_dte) AND (job.id IN (51762,51866,51867,51870,51872,51877,51891,51894,51897,51918,51920,51926,51935,51936,51942,51947,51952,51956,51961,51962,51968,51975,51998,52014,52029,52035,52045,52063,52068,52077,52086,52094,52101,52105,52122,52129,52130,52136,52138,52142,52149,52272,52273,52286,52317,52321,52332,52343,52345,52369,52373,52375,52386,52411,52415,52417,52426,52447,52451,52484,52493,52498,52500,52505,52519,52524,52550,52586,52589,52597,52604,52605,52613,52617,52621,52637,52642,52644,52654,52658,52763,52771,52775,52779,52783,52797,52801,52812,52828,52836,52842,52847,52853,52855,52859,52969,52972,52976,52977,52980,52989,52992,53005,53007,53009,53023,53026,53036,53041,53049,53265,53272,53274,53276,53283,53296,53303,53306,53308,53312,53324,53326,53342,53351,53355,53463,53466,53474,53476,53480,53487,53488,53493,53502,53516,53518,53524,53532,53533,53539,53542,53544,53546,53549,53557,53558,53771,53774,53778,53779,53784,53787,53791,53795,53797,53798,53807,53818,53820,53826,53832,53833,53834,53838,53848,53854,53855,53856,53861,53862,53867,53872,53873,53878,53887,53889,53892,53893,53894,53896,53897,53901,53902,53903,53904,53907,53917,53922,53923,53927,53929,53932,53933,53935,53936,53937,53938,53939,53941,53943,53947,53952,53955,53956,53957,53959,53963,53972,53977,53978,53984,53987,53993,53996,54006,54013,54017,54019,54025,54026,54027,54028,54029,54033,54038,54039,54043,54045,54048,54050,54055,54057,54058,54161,54163,54168,54175,54176,54179,54180,54189,54197,54198,54203,54204,54208,54209,54211,54213,54214,54219,54221,54223,54233,54235,54237,54239,54241,54243,54244,54245,54246,54255,54258,54260,54375,54377,54379,54381,54382,54383,54385,54388,54389,54391,54392,54393,54397,54398,54399,54400,54404,54405,54410,54411,54412,54415,54418,54419,54420,54422,54423,54424,54429,54432,54433,54435,54440,54442,54443,54446,54447,54448,54449,54450,54453,54455,54456,54457,54458,54568,54570,54575,54576,54579,54581,54582,54583,54585,54590,54591,54592,54593,54599,54600,54601,54602,54603,54605,54607,54611,54614,54617,54620,54622,54624,54626,54627,54629,54630,54631,54634,54635,54642,54645,54646,54652,54653,54654,54655,54657,54658,54660,54761,54763,54764,54768,54769,54770,54771,54775,54777,54780,54781,54783,54784,54786,54787,54789,54790,54792,54794,54795,54798,54799,54802,54806,54807,54808,54810,54811,54814,54815,54817,54818,54819,54820,54821,54822,54825,54826,54830,54831,54833,54835,54838,54839,54840,54842,54844,54845,54846,54850,54851,54852,54853,54854,54856,54857,54858,54860,55161,55162,55163,55164,55166,55167,55168,55170,55171,55172,55173,55175,55176,55177,55178,55179,55180,55181,55182,55184,55185,55186,55187,55188,55189,55190,55191,55193,55194,55195,55197,55199,55200,55202,55204,55205,55206,55208,55209,55210,55211,55215,55223,55231,55242,55253,55468,55473,55478,55490,55499,55506,55509,55515,55523,55530,55538,55545,55557,55666,55675,55682,55686,55693,55732,55765,55767,55777,55780,55785,55789,55790,55822,55834,55842,55855,55859,55869,55870,55881,55884,55892,55904,55910,55915,55923,55927,55938,55939,55949,55978,55987,55993,56000,56006,56025,56029,56034,56056,56070,56074,56084,56089,56112,56117,56130,56170,56209,56234,56237,56242,56243,56250,56256,56276,56280,56299,56306,56307,56323,56343,56350,56352,56354,56358,56361,56367,56370,56384,56385,56394,56399,56405,56421,56423,56425,56430,56431,56435,56440,56444,56449,56470,56482,56483,56485,56501,56510,56521,56552,56564,56568,56572,56575,56578,56584,56589,56602,56607,56612,56620,56621,56626,56630,56635,56660,56662,56684,56696,56697,56705,56707,56724,56737,56761,56768,56777,56785,56796,56807,56834,56836,56838,56840,56845,56847,56851,56853,56854,56856,56858,56864,56865,56875,56877,56894,56917,56962,56975,56976,56980,56985,56999,57001,57004,57005,57020,57023,57035,57040,57055,57059,57072,57075,57088,57104,57112,57119,57125,57129,57135,57150,57176,57183,57191,57195,57200,57201,57205,57207,57214,57216,57223,57224,57234,57237,57253,57256,57257,57258,57259,57260,57261,57265,57269,57270,57277,57279,57284,57292,57296,57298,57302,57305,57309,57312,57316,57326,57329,57330,57333,57336,57339,57344,57354,57355,57356,57359,57364,57366,57383,57393,57402,57404,57405,57406,57414,57419,57423,57427,57428,57431,57432,57433,57436,57447,57450,57454,57468,57469,57470,57472,57476,57481,57482,57486,57490,57491,57494,57499,57501,57505,57507,57514,57516,57517,57523,57526,57530,57531,57537,57540,57545,57554,57560,57563,57566,57568,57569,57576,57577,57579,57582,57583,57596,57597,57600,57602,57605,57608,57611,57614,57621,57623,57626,57627,57628,57634,57638,57641,57646,57647,57649,57655,57660,57662,57663,57664,57665,57666,57669,57673,57674,57689,57691,57692,57693,57695,57696,57698,57700,57705,57707,57712,57715,57726,57727,57728,57730,57732,57733,57738,57740,57743,57744,57746,57754,57755,57757,57758,57760,57766,57767,57768,57771,57775,57777,57780,57781,57782,57783,57784,57785,57789,57792,57795,57796,57801,57802,57806,57807,57810,57813,57814,57817,57819,57822,57824,57825,57828,57836,57837,57839,57841,57844,57845,57846,57847,57849,57850,57851,57853,57855,57856,57857,57858,57859,57860,57861,57862,57863,57865,57866,57868,57869,57871,57872,57875,57876,57877,57878,57879,57880,57881,57882,57883,57884,57888,57891,57893,57895,57896,57897,57898,57901,57903,57904,57905,57906,57908,57910,57911,61666,61669,61672,61673,61674,61675,61678,61680,61681,61684,61685,61686,61688,61690,61697,61700,61701,61702,61704,61706,61712,61713,61717,61748,62282,62283,62284,62285,62295,62303,62304,62305,62308,62309,62310,62312,62699,62712,62713,62866,62867,62868,63069,63481,63484,63485,63486,63487,63488,63489,63490,63491,64887,64988,64991,65090,65091,65092,65094,65095,65097,65099,65101,66087,66088,66089,66091,66094,66096,66098,66099,66101,66102,66104,66108,66109,66110,66288,66290,66292,66293,66294,66298,66300,66301,66302,66303,66304,66306,66310,66311,66312,66501,66508,66509,66510,66512,66515,66516,66517,66519,66524,66525,66526,66788,66790,66791,66792,66795,66796,66797,66805,66806,66808,66810,67090,67091,67093,67094,67096,67099,67100,67103,67108,67109,67110,67111,67387,67388,67587,67589,67592,67595,67596,67597,67598,67599,67601,67602,67603,67604,67607,67608,67609,67610,67611,67612,68089,68090,68091,68094,69088,69089,69488,69888,70088,70091,70095,70788,70888,71188,71288,71289,71688,71989,72290,73490,74198,74202,74205,86398,87097,91601,92902,103100,103398,104301,110799,110804,110805,110900,111003,111100,138904,145403,145601,146404,147801,153903,177517,217613,217619,217817,218118,218417,222118,225514))";
                } else if (deploymentID == 'customdeploy_asc_mr_adhoc_2') {
                    //queryStr = "SELECT resourceAllocation.allocationResource AS employee,billng_info.custrecord_blng_cyle,job.ID,job.custentity_clb_bilcycle,job.customer,billng_info.custrecord_bln_strt_dte,billng_info.custrecord_blng_end_dte,job.custentity_clb_lastday,job.custentity_clb_projecttypeforinvoicing,job.parent,job.custentity_clb_missing_invoice_dates,resourceAllocation.startdate,resourceAllocation.enddate FROM job LEFT JOIN customrecord_clb_clientspecificbillingcy AS billng_info ON (billng_info.custrecord_blng_cyle = job.custentity_clb_bilcycle) LEFT JOIN resourceAllocation ON (job.id = resourceAllocation.project) WHERE (job.custentity_clb_projecttypeforinvoicing IN (1,2)) AND (job.custentity_clb_parentproject IS NULL) AND (job.custentity_clb_bilcycle IS NOT NULL) AND (job.startdate<='04/09/2024' ) AND (resourceAllocation.startdate <= billng_info.custrecord_blng_end_dte AND resourceAllocation.enddate >= billng_info.custrecord_bln_strt_dte) AND job.ID IN (36844,36853,36855,36859,36873,36876,36879,36882,36892,36894,36899,36915,36928,36935,36936,36938,36951,36953,36968,36972,37010,37019,37020,37024,37029,37038,37041,37045,37048,37062,37093,37096,37097,37107,37113,37122,37125,37128,37142,37146,37157,37174,37179,37187,37198,37205,37215,37233,37246,37254,37255,37256,37261,37263,37305,37315,37318,37343,37349,37403,37405,37414,37432,37436,37453,37456,37470,37473,37488,37497,37514,37517,37520,37521,37527,37529,37538,37543,37547,37562,37574,37609,37629,37640,37642,37650,37659,37672,37674,37683,37685,37689,37716,37731,37747,37749,37756,37766,37769,37773,37778,37791,37827,37847,37865,37880,37882,37920,37932,37937,37947,37980,37989,38004,39013,39035,39057,39061,39065,39067,39069,39079,39095,39137,39173,39295,39315,39333,39337,39353,39369,39413,39433,39435,39449,39479,39489,39593,39601,39603,39619,39623,39639,39643,45823,45826,45845,56646,58071,58073,58075,58095,58097,58099,58419,58421,58583,58611,58613,58617,58619,58621,58623,58627,58631,58633,58635,58637,58641,58645,58651,58653,58655,58667,58669,58671,58675,58853,58855,58857,58859,58865,58867,58875,58887,58891,58899,58935,58939,58943,58969,58971,59033,59045,59047,59097,59099,59103,59107,59109,59111,59113,59115,59189,59191,69299,69302,69305,69306,69307,69834,76258,76559,76574,78360) AND billng_info.custrecord_blng_end_dte <= '04/13/2024'  AND billng_info.custrecord_blng_end_dte >= '12/23/2023'"
                    queryStr = "SELECT billng_info.custrecord_blng_cyle,job.ID,job.custentity_clb_bilcycle,job.customer,billng_info.custrecord_bln_strt_dte,billng_info.custrecord_blng_end_dte,job.custentity_clb_lastday,job.custentity_clb_projecttypeforinvoicing,job.parent,job.custentity_clb_missing_invoice_dates FROM job LEFT JOIN customrecord_clb_clientspecificbillingcy AS billng_info ON (billng_info.custrecord_blng_cyle = job.custentity_clb_bilcycle) WHERE (job.custentity_clb_projecttypeforinvoicing IN (4)) AND (job.custentity_clb_parentproject IS NULL) AND (job.custentity_clb_bilcycle IS NOT NULL) AND (job.startdate<= '06/13/2024' ) AND (billng_info.custrecord_blng_end_dte >='01/01/2024') AND (billng_info.custrecord_blng_end_dte <='06/13/2024') AND (billng_info.custrecord_blng_end_dte >= job.startdate)";

                    // queryStr = "SELECT resourceAllocation.allocationResource AS employee,billng_info.custrecord_blng_cyle,job.ID,job.custentity_clb_bilcycle,job.customer,billng_info.custrecord_bln_strt_dte,billng_info.custrecord_blng_end_dte,job.custentity_clb_lastday,job.custentity_clb_projecttypeforinvoicing,job.parent,job.custentity_clb_missing_invoice_dates,resourceAllocation.startdate,resourceAllocation.enddate FROM job LEFT JOIN customrecord_clb_clientspecificbillingcy AS billng_info ON (billng_info.custrecord_blng_cyle = job.custentity_clb_bilcycle) LEFT JOIN resourceAllocation ON (job.id = resourceAllocation.project) WHERE (job.custentity_clb_projecttypeforinvoicing IN (1,2,3)) AND (job.custentity_clb_parentproject IS NULL) AND (job.custentity_clb_bilcycle IS NOT NULL) AND (billng_info.custrecord_blng_end_dte >='04/26/2024') AND (billng_info.custrecord_blng_end_dte <='05/26/2024') AND (job.startdate<= '05/26/2024' ) AND (resourceAllocation.startdate <= billng_info.custrecord_blng_end_dte AND resourceAllocation.enddate >= billng_info.custrecord_bln_strt_dte)"
                } else {
                    queryStr = "SELECT resourceAllocation.allocationResource AS employee,job.ID,job.custentity_clb_bilcycle,job.customer,job.custentity_clb_lastday,job.custentity_clb_projecttypeforinvoicing,job.parent,job.custentity_clb_missing_invoice_dates FROM job LEFT JOIN resourceAllocation ON (job.id = resourceAllocation.project) WHERE (job.custentity_clb_projecttypeforinvoicing IN (1,2,4)) AND (job.custentity_clb_parentproject IS NULL) AND (job.custentity_clb_missing_invoice_dates IS NOT NULL)"
                    //queryStr = "SELECT resourceAllocation.allocationResource AS employee,job.ID,job.custentity_clb_bilcycle,job.customer,job.custentity_clb_lastday,job.custentity_clb_projecttypeforinvoicing,job.parent,job.custentity_clb_missing_invoice_dates FROM job LEFT JOIN resourceAllocation ON (job.id = resourceAllocation.project) WHERE (job.custentity_clb_projecttypeforinvoicing IN (1,2,4)) AND (job.custentity_clb_parentproject IS NULL) AND (job.custentity_clb_missing_invoice_dates IS NOT NULL) AND (job.id IN(51910))";
                }
                log.debug("getInputData : queryStr ", queryStr)
                if (queryStr) {
                    var results = query.runSuiteQL({
                        query: queryStr
                    });
                    var projectDetails = results.asMappedResults();
                    log.debug("project found: ", projectDetails.length)
                    if (deploymentID != "customdeploy_asc_mr_tnm_grp_msng_ts_inv") {
                        if (projectDetails.length > 0) {
                            return projectDetails;
                        } else {
                            log.debug("No project to process.")
                        }
                    } else {
                        var projObj = {};
                        if (projectDetails.length > 0) {

                            for (var proj = 0; proj < projectDetails.length; proj++) {
                                var projectId = projectDetails[proj].id;


                                var dateString = projectDetails[proj].custentity_clb_missing_invoice_dates;
                                var parent = projectDetails[proj].customer;
                                var projectType = projectDetails[proj].custentity_clb_projecttypeforinvoicing;
                                var dateArray = dateString.split(",");
                                var lastday = projectDetails[proj].custentity_clb_lastday;
                                var employee = projectDetails[proj].employee;
                                var startDate, endDate, tempDate;
                                // log.debug("missing date found: ", dateArray.length)
                                for (var i = 0; i < dateArray.length; i++) {
                                    var values = {};
                                    if (dateArray[i]) {

                                        values["id"] = projectId;
                                        values["custentity_clb_projecttypeforinvoicing"] = projectType
                                        tempDate = dateArray[i].split(":");
                                        // log.debug("tempDate",tempDate)
                                        startDate = tempDate[0];
                                        endDate = tempDate[1];
                                        // log.debug("get input Stage: startDate:endDate : ", startDate + " : " + endDate)
                                        values["custrecord_bln_strt_dte"] = startDate;
                                        values["custrecord_blng_end_dte"] = endDate;
                                        values["custentity_clb_bilcycle"] = projectDetails[proj].custentity_clb_bilcycle
                                        values["customer"] = parent;
                                        values["employee"] = employee;
                                        values["custentity_clb_missing_invoice_dates"] = dateString
                                        var key = projectId + "_" + i;
                                        values["lastday"] = lastday;
                                        //log.debug("values",values);
                                        projObj[key] = values;
                                        // log.debug("Hi",projObj)

                                    }
                                }
                                // log.debug("outside loop",projObj)
                                // return true;
                            }
                            // var newfileObj = file.create({
                            //     name: 'ProjObj',
                            //     fileType: file.Type.JSON,
                            //     contents: JSON.stringify(projObj),
                            //     description: 'This is a plain text Data file.',
                            //     encoding: file.Encoding.UTF8,
                            //     folder: 1385,
                            //     isOnline: true
                            //   });
                            //   var newfileObjId = newfileObj.save();
                            //   log.debug('newfileObjId', newfileObjId)

                            // log.debug("Get Input Data", "final projObj : " + JSON.stringify(projObj));
                            return projObj
                        }
                    }

                } else {
                    log.debug("No project to process.")
                }


            } catch (e) {
                log.error("Errot at Stage : Get Input Data: ", e.message);
                log.error("Errot at Stage : Get Input Data: ", JSON.stringify(e));
            }
        }

        function reduce(context) {
            try {
                var scriptObj = runtime.getCurrentScript();
                var deploymentID = scriptObj.deploymentId;
                //log.debug('context', context);

                var projectDetails = JSON.parse(context.values[0]);
                //log.debug("Reduce Stage: projectDetails", JSON.stringify(projectDetails));
                var billingStartDate = projectDetails.custrecord_bln_strt_dte;
                var billingEndDate = projectDetails.custrecord_blng_end_dte;
                // log.debug("Reduce Stage: startDate:endDate : ", billingStartDate + " : " + billingEndDate)


                var weekendingDays;
                //---------------------------Customer PO details---------------------------
                var splitDate = '';
                var customerPODetails = false;
                var poLength = 0;
                var billSplit = false;
                var customerID = projectDetails.customer;
                // log.debug("customerID",customerID);
                var projectID = projectDetails.id;
                var projectLookUp = search.lookupFields({
                    type: "job",
                    id: projectID,
                    columns: ['subsidiary', 'custentity_clb_missing_invoice_dates']
                });
                var missingInvoices = projectLookUp.custentity_clb_missing_invoice_dates ? projectLookUp.custentity_clb_missing_invoice_dates : '';
                log.debug("reduce", "missingInvoices   " + missingInvoices)
                var projSubsidiary = projectLookUp.subsidiary[0].value;
                var projectFilter = [];
                var projectType = projectDetails.custentity_clb_projecttypeforinvoicing;
                var createInvoiceCheck = false;
                var tranErr = false;
                //  log.debug("Reduce Stage: ", "Project Type: " + projectType);
                if (projSubsidiary == 4) {
                    if (projectType == 1 || projectType == 2 || projectType == 3) {
                        projectFilter.push(projectID);
                        if (deploymentID == 'customdeploy_asc_mr_timesheet_invoicing') {
                            var resStrt = projectDetails.startdate;
                            var resEnd = projectDetails.enddate;
                            if (new Date(resStrt) > new Date(billingStartDate)) {
                                billingStartDate = resStrt;
                            }
                            if (new Date(billingEndDate) > new Date(resEnd)) {
                                billingEndDate = resEnd;
                            }
                        }
                        weekendingDays = getDaysinPeriod(billingStartDate, billingEndDate);

                        var wkendinTime = checktsCount(projectID, billingStartDate, billingEndDate);
                        // log.debug("Days in Cycle : Days in Time Track", weekendingDays + " : " + wkendinTime);
                        if (wkendinTime >= weekendingDays) {
                            createInvoiceCheck = true;
                            log.debug("Reduce Stage: Create Invoice: ", createInvoiceCheck);
                        }

                    } else {
                        var billCycle = projectDetails.custentity_clb_bilcycle;
                        var billcycleDiff = false;
                        //log.debug("Parent Project Bill Cycle", billCycle)
                        var subProjQuery = "SELECT resourceAllocation.allocationResource AS employee,job.ID,job.custentity_clb_bilcycle,job.customer,job.custentity_clb_lastday,resourceAllocation.startdate,resourceAllocation.enddate FROM job LEFT JOIN resourceAllocation ON (job.id = resourceAllocation.project) WHERE (job.custentity_clb_projecttypeforinvoicing IN (1,2,3)) AND (job.custentity_clb_parentproject = '" + projectID + "') AND (job.startdate <= '" + billingEndDate + "' ) AND (resourceAllocation.startdate <= '" + billingEndDate + "' AND resourceAllocation.enddate >= '" + billingStartDate + "')";
                        var subRunQuery = query.runSuiteQL({
                            query: subProjQuery
                        });
                        var subProjResults = subRunQuery.asMappedResults();
                        // log.debug("Sub project found: ", subProjResults.length);

                        if (subProjResults.length > 0) {
                            for (var sp = 0; sp < subProjResults.length; sp++) {
                                var tmpBlCycl = subProjResults[sp].custentity_clb_bilcycle;
                                //   log.debug("Bill Cycle of the child project: " + sp,tmpBlCycl);
                                if (tmpBlCycl != billCycle) {
                                    billcycleDiff = true;
                                }
                            }
                            // log.debug("billcycleDiff", billcycleDiff)
                            if (!billcycleDiff) {

                                var grpInvCrtn = true;
                                for (var sub = 0; sub < subProjResults.length; sub++) {
                                    var tempBillStart = projectDetails.custrecord_bln_strt_dte;
                                    var tempBillEnd = projectDetails.custrecord_blng_end_dte;
                                    // log.debug("subproject internal id: ",subProjResults[sub].id)

                                    projectFilter.push(subProjResults[sub].id);
                                    var resStrt = subProjResults[sub].startdate;
                                    var resEnd = subProjResults[sub].enddate;
                                    if (new Date(resStrt) > new Date(tempBillStart)) {
                                        tempBillStart = resStrt;
                                    }
                                    if (new Date(tempBillEnd) > new Date(resEnd)) {
                                        tempBillEnd = resEnd;
                                    }
                                    //log.debug("tempBillStart : tempBillEnd",tempBillStart + " : "+tempBillEnd);
                                    var wkendinTime = checktsCount(subProjResults[sub].id, tempBillStart, tempBillEnd);
                                    weekendingDays = getDaysinPeriod(tempBillStart, tempBillEnd);
                                    log.debug("Days in Cycle : Days in Time Track of Subproject: " + subProjResults[sub].id, weekendingDays + " : " + wkendinTime);
                                    if (wkendinTime < weekendingDays) {
                                        grpInvCrtn = false;
                                    }
                                }
                                // log.debug("Reduce Stage: Create Invoice for grp: ", grpInvCrtn);
                                if (grpInvCrtn) {
                                    createInvoiceCheck = true;
                                }
                                log.debug("Reduce Stage: Create Invoice: ", createInvoiceCheck);

                            } else {
                                log.error("Transaction Failure Report creation")
                                var errID = lib.trnsctnFailureRec(billingStartDate, billingEndDate, "Invoice Creation Failed because Subprojects has different Billing Cycles.", 1, projectID)
                                log.error("Error in createInvoice: Created the Transaction Error ID", errID);
                                if (deploymentID == "customdeploy_asc_grp_ts_invoicing") {
                                    log.debug("submitted todays date in project")
                                    var projectID = record.submitFields({
                                        type: record.Type.JOB,
                                        id: projectID,
                                        values: {
                                            "custentity_clb_nst_lst_invc_dte": new Date()
                                        },
                                        options: {
                                            enableSourcing: false,
                                            ignoreMandatoryFields: true
                                        }
                                    });
                                }
                                if (deploymentID == "customdeploy_asc_mr_tnm_grp_msng_ts_inv") {
                                    var currentmissingDates = billingStartDate + ":" + billingEndDate;
                                    context.write({
                                        key: projectID,
                                        value: currentmissingDates
                                    })
                                }
                                tranErr = true;
                                // log.debug("Transaction Error check", tranErr)
                            }
                        } else {
                            log.error("Transaction Failure Report creation")
                            var errID = lib.trnsctnFailureRec(billingStartDate, billingEndDate, "Invoice Creation Failed because Subprojects are not available to bill.", 1, projectID);
                            log.error("Error in createInvoice: Created the Transaction Error ID", errID);
                            if (deploymentID == "customdeploy_asc_grp_ts_invoicing") {
                                // log.debug("submitted todays date in project")
                                var projectID = record.submitFields({
                                    type: record.Type.JOB,
                                    id: projectID,
                                    values: {
                                        "custentity_clb_nst_lst_invc_dte": new Date()
                                    },
                                    options: {
                                        enableSourcing: false,
                                        ignoreMandatoryFields: true
                                    }
                                });
                            }
                            if (deploymentID == "customdeploy_asc_mr_tnm_grp_msng_ts_inv") {
                                var currentmissingDates = billingStartDate + ":" + billingEndDate;
                                context.write({
                                    key: projectID,
                                    value: currentmissingDates
                                })
                            }
                            tranErr = true;
                            log.debug("Transaction Error check", tranErr)
                        }

                    }
                    if (!tranErr) {
                        // log.debug("Customer PO search: for individual project");
                        var customerPOSearchObj = search.create({
                            type: "customrecord_ascendion_cust_po_details",
                            filters: [
                                ["custrecord_asc_cpd_lnk_to_prj", "anyof", projectID],
                                "AND",
                                [
                                    ["custrecord_asc_cpd_end_date", "onorafter", billingStartDate], "AND", ["custrecord_asc_cpd_start_date", "onorbefore", billingEndDate]
                                ]
                            ],
                            columns: [
                                search.createColumn({
                                    name: "custrecord_asc_cpd_start_date",
                                    sort: search.Sort.ASC,
                                    label: "Start Date"
                                }),
                                search.createColumn({
                                    name: "custrecord_asc_cpd_single_budget"
                                }),
                                search.createColumn({
                                    name: "custrecord_asc_cpd_ignore_budget"
                                }),
                                search.createColumn({
                                    name: "custrecord_asc_cpd_billing_address"
                                }),
                                search.createColumn({
                                    name: "custrecord_asc_cpd_billing_address_2"
                                }),
                                search.createColumn({
                                    name: "custrecord_asc_cpd_city"
                                }),
                                search.createColumn({
                                    name: "custrecord_asc_cpd_state"
                                }),
                                search.createColumn({
                                    name: "custrecord_asc_cpd_zip"
                                }),
                                search.createColumn({
                                    name: "custrecord_asc_cpd_country"
                                }),
                                search.createColumn({
                                    name: "custrecord_asc_cpd_start_date"
                                }),
                                search.createColumn({
                                    name: "custrecord_asc_cpd_end_date"
                                }),
                                search.createColumn({
                                    name: "custrecord_asc_cpd_cust_po_num"
                                }),
                                search.createColumn({
                                    name: "custrecord_asc_cpd_sales_tax"
                                })
                            ]
                        });
                        var poResultSet = customerPOSearchObj.run();
                        customerPODetails = poResultSet.getRange({
                            start: 0,
                            end: 2
                        });
                        poLength = customerPODetails.length;
                        log.debug("Customer PO Details found: ", customerPODetails.length);
                        if (customerPODetails.length == 2) {
                            splitDate = customerPODetails[1].getValue("custrecord_asc_cpd_start_date");
                        } else {
                            splitDate = "nosplit";

                            if (customerPODetails.length > 0) {
                                customerPODetails = customerPODetails[0]
                            } else {
                                customerPODetails = false

                            }
                            if (projectType == 1 || projectType == 2 || projectType == 3) {
                                var employee = projectDetails.employee;
                                log.debug("employee for the project", employee);
                                var customrecord_clb_subconbillrateSearchObj = search.create({
                                    type: "customrecord_clb_subconbillrate",
                                    filters: [
                                        ["custrecord_clb_subconbillrecord", "anyof", employee],
                                        "AND",
                                        ["custrecord_clb_proj_bill", "anyof", projectID],
                                        "AND",
                                        ["custrecord_clb_eff_date", "onorbefore", billingEndDate],
                                        "AND",
                                        ["custrecord_clb_eff_date", "after", billingStartDate]
                                    ],
                                    columns: [
                                        search.createColumn({
                                            name: "custrecord_clb_eff_date",
                                            summary: "GROUP",
                                            label: "Effective Date",
                                            sort: search.Sort.DESC
                                        }),
                                    ]
                                });
                                var billrateSearch = customrecord_clb_subconbillrateSearchObj.run();
                                billrateSearch = billrateSearch.getRange({
                                    start: 0,
                                    end: 1
                                });
                                log.debug("billrateSearch.length", billrateSearch.length)
                                if (billrateSearch.length >= 1) {

                                    splitDate = billrateSearch[0].getValue({
                                        name: "custrecord_clb_eff_date",
                                        summary: "GROUP",
                                        label: "Effective Date"
                                    })
                                    billSplit = true;
                                }
                            }

                        }
                        // log.debug("Split Date: ", splitDate)

                    }
                    /*else{
                        var customerPOSearchObj = search.create({
                            type: "customrecord_ascendion_cust_po_details",
                            filters: [
                                [["custrecord_asc_cpd_end_date","onorafter",billingStartDate],"AND",["custrecord_asc_cpd_start_date","onorbefore",billingEndDate]],
                                "AND",
                                ["custrecord_asc_cpd_lnk_to_prj", "anyof", projectID]
                            ],
                            columns: [
                                search.createColumn({
                                    name: "custrecord_asc_cpd_single_budget"
                                }),
                                search.createColumn({
                                    name: "custrecord_asc_cpd_ignore_budget"
                                }),
                                search.createColumn({
                                    name: "custrecord_asc_cpd_billing_address"
                                }),
                                search.createColumn({
                                    name: "custrecord_asc_cpd_billing_address_2"
                                }),
                                search.createColumn({
                                    name: "custrecord_asc_cpd_city"
                                }),
                                search.createColumn({
                                    name: "custrecord_asc_cpd_state"
                                }),
                                search.createColumn({
                                    name: "custrecord_asc_cpd_zip"
                                }),
                                search.createColumn({
                                    name: "custrecord_asc_cpd_country"
                                }),
                                search.createColumn({
                                    name: "custrecord_asc_cpd_start_date"
                                }),
                                search.createColumn({
                                    name: "custrecord_asc_cpd_end_date"
                                }),
                                search.createColumn({
                                    name: "name"
                                })
                            ]
                        });
                        var poResultSet = customerPOSearchObj.run();
                        
                        customerPODetails = poResultSet.getRange({
                            start: 0,
                            end: 1
                        });
                        poLength = customerPODetails.length;
                        if(customerPODetails.length>0){
                            customerPODetails = customerPODetails[0]
                        }else{
                            customerPODetails = false;
                        }
                        
                        splitDate = "nosplit";
                    }
                    */

                    var poStartDate;
                    var poEndDate;
                    //   log.debug("customerPODetails", customerPODetails)
                    if (customerPODetails) {
                        if (poLength == 2) {
                            poStartDate = customerPODetails[0].getValue("custrecord_asc_cpd_start_date");
                            poEndDate = customerPODetails[1].getValue("custrecord_asc_cpd_end_date");
                        } else if (poLength > 0) {
                            poStartDate = customerPODetails.getValue("custrecord_asc_cpd_start_date");
                            poEndDate = customerPODetails.getValue("custrecord_asc_cpd_end_date");
                        }
                        log.debug("poStartDate : poEndDate", poStartDate + " : " + poEndDate)
                        if (new Date(poStartDate) > new Date(billingStartDate)) {
                            billingStartDate = poStartDate;
                        }
                        if (new Date(poEndDate) < new Date(billingEndDate)) {
                            billingEndDate = poEndDate
                        }
                    }

                    log.debug("Final billingStartDate : billingEndDate", billingStartDate + " : " + billingEndDate)

                    //------End Check Weekending dates------
                    log.debug("projectFilter.length", projectFilter.length);
                    if (projectFilter.length && createInvoiceCheck) {
                        // log.debug("Create Invoice Check is true")
                        var timebillSearchObj = search.create({
                            type: "timebill",
                            filters: [
                                ["customer", "anyof", projectFilter],
                                "AND",
                                ["date", "within", billingStartDate, billingEndDate],
                                "AND",
                                ["custcol_asc_timesheet_status", "anyof", "2"],
                                "AND",
                                ["status", "is", "T"],
                                "AND",
                                ["type", "anyof", "A"],
                                "AND",
                                ["custcol_clb_weekendingdate", "isnotempty", ""],
                                "AND",
                                ["custcol_clb_invoice", "anyof", "@NONE@"]
                            ],
                            columns: [
                                search.createColumn({
                                    name: "date",
                                    sort: search.Sort.ASC
                                }),
                                search.createColumn({
                                    name: "internalid",
                                    join: "item"
                                }),
                                search.createColumn({
                                    name: "hours"
                                }),
                                search.createColumn({
                                    name: "custcol_clb_billrate"
                                }),
                                search.createColumn({
                                    name: "durationdecimal"
                                }),
                                search.createColumn({
                                    name: "custcol_asc_timesheet_task_budget"
                                })

                            ]
                        });

                        if (splitDate == "nosplit") {
                            var invoicingDetails = {};
                            var invoiceTotal = 0;
                            timebillSearchObj.run().each(function (result) {
                                var trackTimeID = result.id;
                                var taskID = result.getValue({
                                    name: "internalid",
                                    join: "item"
                                });
                                var hours = result.getValue("hours") ? result.getValue("hours") : 0;
                                var billRate = result.getValue("custcol_clb_billrate") ? result.getValue("custcol_clb_billrate") : 0;
                                var hoursDecimal = result.getValue("durationdecimal") ? result.getValue("durationdecimal") : 0;
                                var budget = result.getValue("custcol_asc_timesheet_task_budget") ? result.getValue("custcol_asc_timesheet_task_budget") : 0;

                                if (!invoicingDetails.hasOwnProperty(taskID)) {
                                    var trackTimeDetails = {
                                        "tracktimeId": [],
                                        "hours": [],
                                        "billRate": [],
                                        "taskTotal": 0,
                                        "budget": 0,
                                        "existingTotal": 0
                                    };
                                    invoicingDetails[taskID] = trackTimeDetails;

                                }
                                invoicingDetails[taskID]["tracktimeId"].push(trackTimeID);
                                invoicingDetails[taskID]["hours"].push(hours);
                                invoicingDetails[taskID]["billRate"].push(billRate);
                                var tempTotal = hoursDecimal * billRate;
                                invoiceTotal += tempTotal;
                                invoicingDetails[taskID].taskTotal += tempTotal
                                if (!invoicingDetails[taskID].budget) {
                                    invoicingDetails[taskID].budget = budget
                                }
                                return true;
                            });
                            log.debug("invoicingDetails", JSON.stringify(invoicingDetails));
                            log.debug("invoiceTotal: ", invoiceTotal);
                            if (invoiceTotal > 0) {
                                log.debug("inv details 1", invoicingDetails);
                                var poDetails = checkBudget(billingStartDate, billingEndDate, projectID, invoicingDetails, invoiceTotal, customerPODetails);
                                //log.debug("poDetails", poDetails)
                                if (poDetails) {
                                    var invoiceID = createInvoice(invoicingDetails, projectType, customerID, projectID, billingStartDate, billingEndDate, poDetails, deploymentID);
                                    // log.debug("Reduce Stage: Invoice ID: ", invoiceID);
                                    //------check if the missing dates has been stamped on the project-------
                                    if (invoiceID) {
                                        log.debug("Search for the log created for Missing Timecard and delete if available.")
                                        var customrecord_asc_trnsctn_crtn_rprt_arapSearchObj = search.create({
                                            type: "customrecord_asc_trnsctn_crtn_rprt_arap",
                                            filters: [
                                                ["custrecord_asc_period_strt_date", "on", billingStartDate],
                                                "AND",
                                                ["custrecord_asc_period_end_date", "on", billingEndDate],
                                                "AND",
                                                ["custrecord_asc_transaction_type", "anyof", "1"],
                                                "AND",
                                                ["custrecord_asc_project_id", "anyof", projectID]
                                            ],
                                            columns: []
                                        });
                                        var searchResultCount = customrecord_asc_trnsctn_crtn_rprt_arapSearchObj.runPaged().count;
                                        //   log.debug("transaction error report result count", searchResultCount);
                                        customrecord_asc_trnsctn_crtn_rprt_arapSearchObj.run().each(function (result) {
                                            var transactionerr = record.delete({
                                                type: 'customrecord_asc_trnsctn_crtn_rprt_arap',
                                                id: result.id,
                                            });
                                            //    log.debug("transaction report record deleted id", transactionerr)
                                            return true;
                                        });
                                        var currentmissingDates = billingStartDate + ":" + billingEndDate + ",";
                                        if (deploymentID != "customdeploy_asc_mr_tnm_grp_msng_ts_inv") {
                                            if (missingInvoices && missingInvoices.indexOf(currentmissingDates) > -1) {
                                                var newMissingInvoices = missingInvoices.replace(currentmissingDates, '');
                                                var projectID = record.submitFields({
                                                    type: record.Type.JOB,
                                                    id: projectID,
                                                    values: {
                                                        "custentity_clb_missing_invoice_dates": newMissingInvoices,
                                                        "custentity_clb_nst_lst_invc_dte": new Date()
                                                    },
                                                    options: {
                                                        enableSourcing: false,
                                                        ignoreMandatoryFields: true
                                                    }
                                                });

                                            } else {
                                                var projectID = record.submitFields({
                                                    type: record.Type.JOB,
                                                    id: projectID,
                                                    values: {
                                                        "custentity_clb_nst_lst_invc_dte": new Date()
                                                    },
                                                    options: {
                                                        enableSourcing: false,
                                                        ignoreMandatoryFields: true
                                                    }
                                                });
                                            }
                                        } else {
                                            context.write({
                                                key: projectID,
                                                value: currentmissingDates
                                            })
                                        }

                                    } else {
                                        //    log.debug("Reduce:", "Invoice Creation Failed due to error in Invoice Creation Function")

                                    }

                                } else {
                                    //log.debug("Invoice Creation Failed due to Budget Issue");
                                    // log.debug("Transaction Failure Report creation")
                                    var errID = lib.trnsctnFailureRec(billingStartDate, billingEndDate, "Invoice Creation Failed due to Budget Issue.", 1, projectID)
                                    log.error("Error in createInvoice: Created the Transaction Error ID", errID);
                                    if (deploymentID != "customdeploy_asc_mr_tnm_grp_msng_ts_inv") {
                                        log.debug("submitted todays date in project")
                                        var projectID = record.submitFields({
                                            type: record.Type.JOB,
                                            id: projectID,
                                            values: {
                                                "custentity_clb_nst_lst_invc_dte": new Date()
                                            },
                                            options: {
                                                enableSourcing: false,
                                                ignoreMandatoryFields: true
                                            }
                                        });
                                    }
                                    if (deploymentID == "customdeploy_asc_mr_tnm_grp_msng_ts_inv") {
                                        var currentmissingDates = billingStartDate + ":" + billingEndDate + ",";
                                        context.write({
                                            key: projectID,
                                            value: currentmissingDates
                                        })
                                    }

                                }
                            } else {
                                log.error("Errot at Stage : Reduce function")
                                log.error("Transaction Failure Report creation")
                                var errID = lib.trnsctnFailureRec(billingStartDate, billingEndDate, "Invoice Creation Failed because: Invoice total is 0 due to 0 hours or 0 bill rate", 1, projectID)
                                log.error("Error in createInvoice: Created the Transaction Error ID", errID);
                                if (deploymentID != 'customdeploy_asc_mr_tnm_grp_msng_ts_inv') {
                                    var projectID = record.submitFields({
                                        type: record.Type.JOB,
                                        id: projectID,
                                        values: {
                                            "custentity_clb_nst_lst_invc_dte": new Date()
                                        },
                                        options: {
                                            enableSourcing: false,
                                            ignoreMandatoryFields: true
                                        }
                                    });
                                } else {
                                    //write code for missing deployment
                                }
                            }
                        } else {
                            var invoiceArray = [{
                                "invoiceTotal": 0
                            }, {
                                "invoiceTotal": 0
                            }];
                            // var invoicingDetails = {};

                            timebillSearchObj.run().each(function (result) {
                                var trackTimeID = result.id;
                                var taskID = result.getValue("item");
                                var hours = result.getValue("hours") ? result.getValue("hours") : 0;
                                var billRate = result.getValue("custcol_clb_billrate") ? result.getValue("custcol_clb_billrate") : 0;
                                var hoursDecimal = result.getValue("durationdecimal") ? result.getValue("durationdecimal") : 0;
                                var budget = result.getValue("custcol_asc_timesheet_task_budget") ? result.getValue("custcol_asc_timesheet_task_budget") : 0;
                                var tsdate = result.getValue("date");

                                if (new Date(tsdate) < new Date(splitDate)) {
                                    var invoicingDetails = invoiceArray[0];
                                    if (!invoicingDetails.hasOwnProperty(taskID)) {
                                        var trackTimeDetails = {
                                            "tracktimeId": [],
                                            "hours": [],
                                            "billRate": [],
                                            "taskTotal": 0,
                                            "budget": 0,
                                            "existingTotal": 0
                                        };
                                        invoicingDetails[taskID] = trackTimeDetails;


                                    }
                                    invoicingDetails[taskID]["tracktimeId"].push(trackTimeID);
                                    invoicingDetails[taskID]["hours"].push(hours);
                                    invoicingDetails[taskID]["billRate"].push(billRate);
                                    var tempTotal = hoursDecimal * billRate;
                                    invoicingDetails.invoiceTotal += tempTotal;
                                    invoicingDetails[taskID].taskTotal += tempTotal;
                                    if (!invoicingDetails[taskID].budget) {
                                        invoicingDetails[taskID].budget = budget
                                    }
                                } else {
                                    var invoicingDetails = invoiceArray[1];
                                    if (!invoicingDetails.hasOwnProperty(taskID)) {
                                        var trackTimeDetails = {
                                            "tracktimeId": [],
                                            "hours": [],
                                            "billRate": [],
                                            "taskTotal": 0,
                                            "budget": 0,
                                            "existingTotal": 0
                                        };
                                        invoicingDetails[taskID] = trackTimeDetails;

                                    }
                                    invoicingDetails[taskID]["tracktimeId"].push(trackTimeID);
                                    invoicingDetails[taskID]["hours"].push(hours);
                                    invoicingDetails[taskID]["billRate"].push(billRate);
                                    var tempTotal = hoursDecimal * billRate;
                                    invoicingDetails.invoiceTotal += tempTotal;
                                    invoicingDetails[taskID].taskTotal += tempTotal
                                    if (!invoicingDetails[taskID].budget) {
                                        invoicingDetails[taskID].budget = budget
                                    }
                                }
                                return true;
                            });
                            var podetailsSend = false;
                            // log.debug("invoicing Array", invoiceArray[0]);
                            //   log.debug("invoicing Array[1]", invoiceArray[1]);
                            var invoiceIDs = [];
                            for (var inv = 0; inv < invoiceArray.length; inv++) {
                                if (billSplit) {
                                    podetailsSend = customerPODetails
                                } else {
                                    podetailsSend = customerPODetails[inv]
                                }
                                if (invoiceArray[inv].invoiceTotal > 0) {

                                    var tempId = "";
                                    var invBudIssu = false;
                                    if (inv == 0) {
                                        // log.debug("inv details 2",invoiceArray[inv]);
                                        var poDetails = checkBudget(billingStartDate, billingEndDate, projectID, invoiceArray[inv], invoiceArray[inv].invoiceTotal, podetailsSend);
                                        var yesterday = new Date(splitDate);
                                        yesterday.setDate(yesterday.getDate() - 1);
                                        var nsYest = ('0' + (yesterday.getMonth() + 1)).slice(-2) + '/' +
                                            ('0' + yesterday.getDate()).slice(-2) + '/' +
                                            yesterday.getFullYear();

                                        if (poDetails) {

                                            tempId = createInvoice(invoiceArray[inv], projectType, customerID, projectID, billingStartDate, nsYest, poDetails, deploymentID)
                                            if (tempId) {
                                                invoiceIDs.push(tempId);
                                            }
                                        } else {
                                            // log.debug("Invoice Creation Failed due to Budget Issue");
                                            log.debug("Transaction Failure Report creation")
                                            var errID = lib.trnsctnFailureRec(billingStartDate, nsYest, "Invoice Creation failed due to Budget Issue of PO: " + poDetails.getValue("custrecord_asc_cpd_cust_po_num"), 1, projectID)
                                            log.error("Error in createInvoice: Created the Transaction Error ID", errID);
                                            invBudIssu = true;
                                        }

                                    } else {
                                        //  log.debug("inv details 3",invoiceArray[inv]);
                                        var poDetails = checkBudget(billingStartDate, billingEndDate, projectID, invoiceArray[inv], invoiceArray[inv].invoiceTotal, podetailsSend);

                                        if (poDetails) {
                                            tempId = createInvoice(invoiceArray[inv], projectType, customerID, projectID, splitDate, billingEndDate, poDetails, deploymentID)
                                            if (tempId) {
                                                invoiceIDs.push(tempId);
                                            }
                                        } else {
                                            //  log.debug("Invoice Creation Failed due to Budget Issue");
                                            log.debug("Transaction Failure Report creation")
                                            var errID = lib.trnsctnFailureRec(splitDate, billingEndDate, "Invoice Creation failed due to Budget Issue of PO: " + poDetails.getValue("name"), 1, projectID)
                                            log.error("Error in createInvoice: Created the Transaction Error ID", errID);
                                            invBudIssu = true;

                                        }
                                    }
                                    log.debug("Reduce Stage: Invoice ID: ", invoiceIDs);
                                } else {
                                    log.error("Errot at Stage : Reduce function")
                                    log.error("Transaction Failure Report creation")
                                    var errID;
                                    if (inv == 0) {
                                        errID = lib.trnsctnFailureRec(billingStartDate, splitDate, "Invoice Creation Failed because: Invoice total is 0 due to 0 hours or 0 bill rate", 1, projectID)
                                    } else {
                                        log.error("elsecondition")
                                        errID = lib.trnsctnFailureRec(splitDate, billingEndDate, "Invoice Creation Failed because: Invoice total is 0 due to 0 hours or 0 bill rate", 1, projectID)
                                    }
                                    log.error("Error in createInvoice: Created the Transaction Error ID", errID);
                                    if (deploymentID != 'customdeploy_asc_mr_tnm_grp_msng_ts_inv') {
                                        var projectID = record.submitFields({
                                            type: record.Type.JOB,
                                            id: projectID,
                                            values: {
                                                "custentity_clb_nst_lst_invc_dte": new Date()
                                            },
                                            options: {
                                                enableSourcing: false,
                                                ignoreMandatoryFields: true
                                            }
                                        });
                                    }
                                }
                            }
                            if (invoiceIDs.length > 0) {
                                // log.debug("Search for the log created for Missing Timecard and delete if available.")
                                var customrecord_asc_trnsctn_crtn_rprt_arapSearchObj = search.create({
                                    type: "customrecord_asc_trnsctn_crtn_rprt_arap",
                                    filters: [
                                        ["custrecord_asc_period_strt_date", "on", billingStartDate],
                                        "AND",
                                        ["custrecord_asc_period_end_date", "on", billingEndDate],
                                        "AND",
                                        ["custrecord_asc_transaction_type", "anyof", "1"],
                                        "AND",
                                        ["custrecord_asc_project_id", "anyof", projectID]
                                    ],
                                    columns: []
                                });
                                var searchResultCount = customrecord_asc_trnsctn_crtn_rprt_arapSearchObj.runPaged().count;
                                log.debug("transaction error report result count", searchResultCount);
                                customrecord_asc_trnsctn_crtn_rprt_arapSearchObj.run().each(function (result) {
                                    var transactionerr = record.delete({
                                        type: 'customrecord_asc_trnsctn_crtn_rprt_arap',
                                        id: result.id,
                                    });
                                    log.debug("transaction report record deleted id", transactionerr)
                                    return true;
                                });

                                var currentmissingDates = billingStartDate + ":" + billingEndDate + ",";
                                if (deploymentID != "customdeploy_asc_mr_tnm_grp_msng_ts_inv") {

                                    if (missingInvoices && missingInvoices.indexOf(currentmissingDates) > -1) {
                                        var newMissingInvoices = missingInvoices.replace(currentmissingDates, '');
                                        var projectID = record.submitFields({
                                            type: record.Type.JOB,
                                            id: projectID,
                                            values: {
                                                "custentity_clb_missing_invoice_dates": newMissingInvoices,
                                                "custentity_clb_nst_lst_invc_dte": new Date()
                                            },
                                            options: {
                                                enableSourcing: false,
                                                ignoreMandatoryFields: true
                                            }
                                        });

                                    } else {
                                        var projectID = record.submitFields({
                                            type: record.Type.JOB,
                                            id: projectID,
                                            values: {
                                                "custentity_clb_nst_lst_invc_dte": new Date()
                                            },
                                            options: {
                                                enableSourcing: false,
                                                ignoreMandatoryFields: true
                                            }
                                        });
                                    }
                                } else {
                                    context.write({
                                        key: projectID,
                                        value: currentmissingDates
                                    })
                                }
                            } else {
                                if (invBudIssu && deploymentID != "customdeploy_asc_mr_tnm_grp_msng_ts_inv") {
                                    var projectID = record.submitFields({
                                        type: record.Type.JOB,
                                        id: projectID,
                                        values: {
                                            "custentity_clb_nst_lst_invc_dte": new Date()
                                        },
                                        options: {
                                            enableSourcing: false,
                                            ignoreMandatoryFields: true
                                        }
                                    });
                                }
                                var currentmissingDates = billingStartDate + ":" + billingEndDate + ",";
                                if (invBudIssu && deploymentID == "customdeploy_asc_mr_tnm_grp_msng_ts_inv") {
                                    context.write({
                                        key: projectID,
                                        value: currentmissingDates
                                    })
                                }
                                //log.debug("Reduce:", "Invoice Creation Failed")
                            }

                        }


                    } else {
                        if (!tranErr) {
                            if (deploymentID != "customdeploy_asc_mr_tnm_grp_msng_ts_inv") {
                                log.debug("Reduce Stage:", " Set Missing dates if not present in missingInvoices-   " + missingInvoices);
                                var currentmissingDates = billingStartDate + ":" + billingEndDate + ",";
                                var newMissingDates = '';
                                if (missingInvoices.indexOf(currentmissingDates) == -1) {
                                    // log.debug("Reduce stage:", "Dates are not present in the missing invoice field")
                                    newMissingDates = missingInvoices + currentmissingDates;
                                }

                                if (missingInvoices != newMissingDates && newMissingDates != '') {
                                    // log.debug("Reduce stage:", "missinginvoice setting on project: " + projectID)
                                    var projectID = record.submitFields({
                                        type: record.Type.JOB,
                                        id: projectID,
                                        values: {
                                            "custentity_clb_missing_invoice_dates": newMissingDates,
                                            "custentity_clb_nst_lst_invc_dte": new Date()
                                        },
                                        options: {
                                            enableSourcing: false,
                                            ignoreMandatoryFields: true
                                        }
                                    });
                                    //log.debug("Transaction Failure Report creation")
                                    var errID = lib.trnsctnFailureRec(billingStartDate, billingEndDate, "Invoice Creation Failed due missing timesheet", 1, projectID)
                                    log.error("Error in createInvoice: Created the Transaction Error ID", errID);
                                } else {
                                    //log.debug("Reduce stage:", "Missing Invoice Dates are already present on project: " + projectID)
                                }
                            } else {
                                // log.debug("Reduce stage:", "Time card is still missing: " + projectID)
                            }
                        }

                    }
                }

            } catch (e) {
                log.error("Errot at Stage : Reduce", e.message)
            }
        }

        function createInvoice(invoicingDetails, projectType, customerID, projectID, billingStartDate, billingEndDate, customerPOInfo, deploymentID) {
            try {
                //  log.debug("InvoicingDetails: ", JSON.stringify(invoicingDetails));

                log.debug("invoice creation function for the customer: " + customerID, "Project Type: " + projectType + "  Project ID: " + projectID)
                var invoiceObj = record.create({
                    type: 'invoice',
                    isDynamic: true
                });
                invoiceObj.setValue("entity", customerID)
                invoiceObj.setValue("custbody_clb_projecttypeapproval", projectType)
                invoiceObj.setValue("custbody_asc_inv_project_selected", projectID)
                invoiceObj.setValue("taxdetailsoverride", true);

                if (projectType == 1 || projectType == 2 || projectType == 2) {
                    invoiceObj.setValue({
                        fieldId: 'customform',
                        value: 163,
                        ignoreFieldChange: true
                    })
                } else {
                    invoiceObj.setValue({
                        fieldId: 'customform',
                        value: 168,
                        ignoreFieldChange: true
                    })
                }

                if (customerPOInfo != true) {
                    //log.debug("Setting Customer PO Details:")
                    var poStartDate = new Date(customerPOInfo.getValue("custrecord_asc_cpd_start_date"));
                    var poEndDate = new Date(customerPOInfo.getValue("custrecord_asc_cpd_end_date"));


                    if (poStartDate > new Date(billingStartDate)) {
                        invoiceObj.setValue("custbody_clb_periodstartingdate", poStartDate)
                    } else {
                        invoiceObj.setValue("custbody_clb_periodstartingdate", new Date(billingStartDate))
                    }
                    if (poEndDate < new Date(billingEndDate)) {
                        invoiceObj.setValue("custbody_clb_periodendingdate", poEndDate)
                    } else {
                        invoiceObj.setValue("custbody_clb_periodendingdate", new Date(billingEndDate))
                    }
                    invoiceObj.setValue("startdate", poStartDate);
                    invoiceObj.setValue("enddate", poEndDate);
                    invoiceObj.setValue("otherrefnum", customerPOInfo.getValue("custrecord_asc_cpd_cust_po_num"));

                    if (customerPOInfo.getValue("custrecord_asc_cpd_country")[0]) { //&&customerPOInfo.getValue("custrecord_asc_cpd_state")[0]&&customerPOInfo.getValue("custrecord_asc_cpd_city")&&customerPOInfo.getValue("custrecord_asc_cpd_billing_address")
                        var subrec = invoiceObj.getSubrecord({
                            fieldId: 'shippingaddress'
                        });
                        subrec.setValue({
                            fieldId: 'country',
                            value: customerPOInfo.getValue("custrecord_asc_cpd_country")[0].value
                        });
                        subrec.setValue({
                            fieldId: 'state',
                            value: customerPOInfo.getValue("custrecord_asc_cpd_state").length > 0 ? customerPOInfo.getValue("custrecord_asc_cpd_state")[0].value : ""
                        });
                        subrec.setValue({
                            fieldId: 'city',
                            value: customerPOInfo.getValue("custrecord_asc_cpd_city") ? customerPOInfo.getValue("custrecord_asc_cpd_city") : ""
                        });


                        subrec.setValue({
                            fieldId: 'addr1',
                            value: customerPOInfo.getValue("custrecord_asc_cpd_billing_address") ? customerPOInfo.getValue("custrecord_asc_cpd_billing_address") : ""
                        })
                        subrec.setValue({
                            fieldId: 'addr2',
                            value: customerPOInfo.getValue("custrecord_asc_cpd_billing_address_2") ? customerPOInfo.getValue("custrecord_asc_cpd_billing_address_2") : ""
                        })
                        subrec.setValue({
                            fieldId: 'zip',
                            value: customerPOInfo.getValue("custrecord_asc_cpd_zip") ? customerPOInfo.getValue("custrecord_asc_cpd_zip") : ""
                        })
                        // log.debug("Billing Address Setting done");
                    }
                    var salesTax = customerPOInfo.getValue("custrecord_asc_cpd_sales_tax");
                    if (salesTax) {
                        var salesTaxLookup = search.lookupFields({
                            type: "customrecord_clb_taxgroup",
                            id: salesTax,
                            columns: ['custrecord_asc_taxcode_isgroup']
                        })
                        log.debug("salesTaxLookup", salesTaxLookup);
                        if (salesTaxLookup.custrecord_asc_taxcode_isgroup == true) {
                            invoiceObj.setValue("custbody_clb_applicable_tax_group", salesTax);
                        }
                        else {
                            invoiceObj.setValue("custbody_clb_applicable_tax_code", salesTax);
                        }

                    }

                } else {
                    invoiceObj.setValue("custbody_clb_periodendingdate", new Date(billingEndDate))
                    invoiceObj.setValue("custbody_clb_periodstartingdate", new Date(billingStartDate))
                }

                var timeSheetconsolidatedIDs = [];
                Object.keys(invoicingDetails).forEach(function (key) {
                    if (key != 'invoiceTotal') {
                        //  log.debug('Key : ' + key, 'Value : ' + JSON.stringify(invoicingDetails[key]));
                        var trackTimeDetails = invoicingDetails[key]
                        var trackTimeIDs = trackTimeDetails["tracktimeId"];
                        var timeRate = trackTimeDetails["billRate"];
                        //   log.debug("Invoice creation Function: ", trackTimeIDs + " : " + timeRate)
                        for (var tt = 0; tt < trackTimeIDs.length; tt++) {
                            var linenum = invoiceObj.findSublistLineWithValue({
                                sublistId: 'time',
                                fieldId: 'doc',
                                value: trackTimeIDs[tt]
                            });
                            timeSheetconsolidatedIDs.push(trackTimeIDs[tt])
                            //log.debug("linenum of trackTimeIDs[tt] ", trackTimeIDs[tt] + "is:" + linenum)
                            if (linenum > -1) {
                                invoiceObj.selectLine({
                                    sublistId: 'time',
                                    line: linenum
                                });
                                invoiceObj.setCurrentSublistValue({
                                    sublistId: 'time',
                                    fieldId: 'apply',
                                    value: true
                                });
                                invoiceObj.setCurrentSublistValue({
                                    sublistId: 'time',
                                    fieldId: 'rate',
                                    value: timeRate[tt]
                                });
                                invoiceObj.commitLine({
                                    sublistId: 'time'
                                });
                            }

                        }
                    }
                });
                var invAmount = invoiceObj.getValue("total");
                //  log.debug("Invoice Amount: ", invAmount)
                if (invAmount > 0) {
                    var invoiceID = invoiceObj.save({
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    });
                    log.debug("timeSheetconsolidatedIDs: timeSheetconsolidatedIDs.length", timeSheetconsolidatedIDs + " : " + timeSheetconsolidatedIDs.length)
                    if (invoiceID) {
                        for (var ii = 0; ii < timeSheetconsolidatedIDs.length; ii++) {
                            record.submitFields({
                                type: record.Type.TIME_BILL,
                                id: timeSheetconsolidatedIDs[ii],
                                values: {
                                    "custcol_clb_invoice": invoiceID
                                },
                                options: {
                                    enableSourcing: false,
                                    ignoreMandatoryFields: true
                                }
                            })
                        }
                    }

                    return invoiceID;
                } else {
                    var e = {};
                    e.message = "No Timesheets with hours more than 0 found or No Bill Rate found for the period dates."
                    throw e;
                }


            } catch (e) {
                log.error("Errot at Stage : createInvoice function", e.message)
                log.error("Transaction Failure Report creation")
                var errID = lib.trnsctnFailureRec(billingStartDate, billingEndDate, "Invoice Creation Failed because: " + e.message, 1, projectID)
                log.error("Error in createInvoice: Created the Transaction Error ID", errID);
                if (deploymentID != 'customdeploy_asc_mr_tnm_grp_msng_ts_inv') {
                    var projectID = record.submitFields({
                        type: record.Type.JOB,
                        id: projectID,
                        values: {
                            "custentity_clb_nst_lst_invc_dte": new Date()
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        }
                    });
                }
            }


        }

        function getWeekendingDays(start, end, day) {
            try {
                log.debug("Function getWeekendingDays");
                var result = [];
                var today = new Date();
                var formattedDate = format.format({
                    value: today,
                    type: format.Type.DATETIME,
                    timezone: 'America/New_York'
                })
                var sysdate = new Date(formattedDate);
                log.debug("getWeekendingDays:", " tempDate: " + sysdate + " : day is: " + day);
                //var day = sysdate.getDay();
                // Copy start date
                var current = new Date(start);
                var endDate = new Date(end)
                // Shift to next of required days
                current.setDate(current.getDate() + (day - current.getDay() + 7) % 7);

                // While less than end date, add dates to result array
                while (current <= endDate) {
                    result.push(new Date(+current));
                    current.setDate(current.getDate() + 7);

                }
                return result.length;
            } catch (e) {
                log.error("Errot at function : getWeekendingDays", JSON.stringify(e))
                log.error("Errot at function : getWeekendingDays", e.message)
            }
        }

        function getDaysinPeriod(start, end) {
            // The number of milliseconds in one day
            var ONE_DAY = 1000 * 60 * 60 * 24;
            var date1 = new Date(start);
            var date2 = new Date(end);
            // Calculate the difference in milliseconds
            const differenceMs = Math.abs(date1 - date2);

            // Convert back to days and return
            return Math.round(differenceMs / ONE_DAY) + 1;
        }

        function checkBudget(billingStartDate, billingEndDate, projectID, invoicingDetails, currentInvoiceTotal, customerPODetails) {
            log.audit("CheckBudget Function: ");
            log.debug("CheckBudget Function: ", "billingStartDate:billingEndDate:projectID  :  " + billingStartDate + ":" + billingEndDate + ":" + projectID)
            var ignoreBudget = false;
            log.debug("CheckBudget Function: ", "ignorebudget initial Value : " + ignoreBudget)

            log.debug("CheckBudget Function: ", "customerPODetails  " + JSON.stringify(customerPODetails))
            if (customerPODetails) {
                ignoreBudget = customerPODetails.getValue("custrecord_asc_cpd_ignore_budget");
                log.debug("CheckBudget Function: ", "ignoreBudget " + ignoreBudget)
                var customerPOstartDate = customerPODetails.getValue('custrecord_asc_cpd_start_date');
                var customerPOEndDate = customerPODetails.getValue('custrecord_asc_cpd_end_date');
                if (!ignoreBudget) {
                    singleBudget = customerPODetails.getValue("custrecord_asc_cpd_single_budget");
                    log.debug("CheckBudget Function: ", "singleBudget: " + singleBudget)
                    var existingInvoiceTotal = 0;
                    // log.debug("CheckBudget Function: ","existingInvoiceTotal - " +existingInvoiceTotal)
                    var invoiceTotal = 0;

                    if (singleBudget != "" && singleBudget > 0) {
                        var invoiceSearchObj = search.create({
                            type: "invoice",
                            filters: [
                                ["type", "anyof", "CustInvc"],
                                "AND",
                                ["custbody_asc_inv_project_selected", "anyof", projectID],
                                "AND",
                                ["mainline", "is", "T"],
                                "AND",
                                ["custbody_clb_periodstartingdate", "onorafter", customerPOstartDate],
                                "AND",
                                ["custbody_clb_periodendingdate", "onorbefore", customerPOEndDate] // status check with satish
                            ],
                            columns: [
                                search.createColumn({
                                    name: "amount",
                                    summary: "SUM"
                                })
                            ]
                        });
                        var searchRun = invoiceSearchObj.run();
                        var existinginvoiceDetails = searchRun.getRange({
                            start: 0,
                            end: 1
                        });
                        log.debug("existing invoices length: ", existinginvoiceDetails.length + " : " + JSON.stringify(existinginvoiceDetails))
                        if (existinginvoiceDetails.length > 0) {
                            existingInvoiceTotal = existinginvoiceDetails[0].getValue({
                                name: "amount",
                                summary: "SUM"
                            });
                            log.debug("CheckBudget Function: ", "existingInvoiceTotal " + existingInvoiceTotal);
                        }
                        if (existingInvoiceTotal) {
                            invoiceTotal = parseFloat(existingInvoiceTotal) + currentInvoiceTotal;
                            log.debug("CheckBudget Function: ", " Current Invoice Amount + Exisiting Amount: : " + invoiceTotal)
                        } else {
                            invoiceTotal = currentInvoiceTotal;
                            log.debug("CheckBudget Function: ", " Current Invoice Amount + Exisiting Amount: " + invoiceTotal)
                        }


                        if (invoiceTotal > parseFloat(singleBudget)) {
                            log.debug("Total amount is exceeding po budget ")

                            return false;
                        } else {
                            log.debug("Total amount is not exceeding po budget. Create Invoice and Set PO details")
                            return customerPODetails;
                        }
                    } else {
                        log.debug("Single Budget is less than 0 or Single Budget is not there");
                        //check the task budget
                        log.debug("Invoicing Details", JSON.stringify(invoicingDetails));


                        var serviceItems = Object.keys(invoicingDetails);
                        log.debug("serviceItems: ", serviceItems + " : Service Item length " + serviceItems.length);
                        var existinginvoiceSearchObj = search.create({
                            type: "invoice",
                            filters: [
                                ["type", "anyof", "CustInvc"],
                                "AND",
                                ["mainline", "is", "F"],
                                "AND",
                                ["item", "anyof", serviceItems],
                                "AND",
                                ["taxline", "is", "F"],
                                "AND",
                                ["custbody_asc_inv_project_selected", "anyof", projectID],
                                "AND",
                                ["custbody_clb_periodstartingdate", "onorafter", customerPOstartDate],
                                "AND",
                                ["custbody_clb_periodendingdate", "onorbefore", customerPOEndDate]
                            ],
                            columns: [
                                search.createColumn({
                                    name: "trandate",
                                    summary: "GROUP",
                                    label: "Date"
                                }),
                                search.createColumn({
                                    name: "tranid",
                                    summary: "GROUP",
                                    label: "Document Number"
                                }),
                                search.createColumn({
                                    name: "item",
                                    summary: "GROUP",
                                    label: "Item"
                                }),
                                search.createColumn({
                                    name: "quantity",
                                    summary: "SUM",
                                    label: "Quantity"
                                }),
                                search.createColumn({
                                    name: "amount",
                                    summary: "SUM",
                                    label: "Amount"
                                })
                            ]
                        });
                        var searchRun = existinginvoiceSearchObj.run();
                        var existinginvoiceSearchObj = searchRun.getRange({
                            start: 0,
                            end: serviceItems.length - 1
                        });
                        log.debug("existinginvoiceSearchObj", JSON.stringify(existinginvoiceSearchObj));
                        log.debug("InvoiceDetails length", existinginvoiceSearchObj.length);
                        if (existinginvoiceSearchObj.length > 0) {
                            for (var ii = 0; ii < existinginvoiceSearchObj.length; ii++) {
                                var itemID = existinginvoiceSearchObj[ii].getValue({
                                    name: "item",
                                    summary: "GROUP"
                                });
                                var itemtotal = existinginvoiceSearchObj[ii].getValue({
                                    name: "amount",
                                    summary: "SUM"
                                });

                                invoicingDetails[itemID].existingTotal = itemtotal

                            }

                        }
                        var budgetExceed = false;
                        Object.keys(invoicingDetails).forEach(function (key) {
                            log.debug('Key : ' + key + ', Value : ' + invoicingDetails[key]);
                            log.debug("Task Budget", invoicingDetails[key].budget + ": currentTaskBudget " + invoicingDetails[key].taskTotal + "  exisiting Task total: " + invoicingDetails[key].existingTotal)
                            var budgetUsed = parseFloat(invoicingDetails[key].taskTotal) + parseFloat(invoicingDetails[key].existingTotal)
                            log.debug("Budget Used: ", budgetUsed)
                            if (budgetUsed > invoicingDetails[key].budget && invoicingDetails[key].budget > 0) {
                                budgetExceed = true;
                            }
                        });
                        log.debug("budgetExceed: ", budgetExceed)
                        if (budgetExceed) {
                            return false;
                        } else {
                            return customerPODetails;
                        }
                    }
                } else {
                    log.debug("ignore budget is there")
                    return customerPODetails;
                }
            } else {
                log.debug("No customer PO found")
                return true; //update to invoice creation 
            }

        }

        function checktsCount(projectFilter, billingStartDate, billingEndDate) {
            log.debug("Check TS Count function")
            var wkendinTime;
            var trackTimeObj = search.create({
                type: "timebill",
                filters: [
                    ["customer", "anyof", projectFilter],
                    "AND",
                    ["date", "within", billingStartDate, billingEndDate],
                    "AND",
                    ["custcol_asc_timesheet_status", "anyof", "2"],
                    "AND",
                    ["status", "is", "T"],
                    "AND",
                    ["custcol_clb_weekendingdate", "isnotempty", ""],
                    "AND",
                    ["type", "anyof", "A"],
                    "AND",
                    ["custcol_clb_invoice", "anyof", "@NONE@"]
                ],
                columns: [
                    search.createColumn({
                        name: "date",
                        summary: "GROUP"
                    }) //,
                    // search.createColumn({
                    //     name: "customer",
                    //     summary: "GROUP"
                    // })
                ]
            });
            wkendinTime = trackTimeObj.runPaged().count;
            log.debug("Reduce Stage: Weekending Dates In Time", wkendinTime);
            return wkendinTime;
        }

        function summarize(context) {
            log.debug("reduce summary:", JSON.stringify(context.reduceSummary))
            var scriptObj = runtime.getCurrentScript();
            var deploymentID = scriptObj.deploymentId;
            //log.debug('getInputData', 'Deployment Id: ' + deploymentID);

            if (deploymentID == "customdeploy_asc_mr_tnm_grp_msng_ts_inv") {
                var missingInvObj = {};
                context.output.iterator().each(function (key, value) {
                    log.debug("Summarize", "Key : " + key + "; Value : " + JSON.stringify(value));
                    if (!missingInvObj.hasOwnProperty(key)) {
                        missingInvObj[key] = [];
                        missingInvObj[key].push(value);
                    }
                    missingInvObj[key].push(value);
                    return true;
                })
                log.debug("Summarize", "missingOnvObj : " + JSON.stringify(missingInvObj));
                Object.keys(missingInvObj).forEach(function (key) {

                    var values = missingInvObj[key];

                    var projectLookUp = search.lookupFields({
                        type: "job",
                        id: key,
                        columns: ['custentity_clb_missing_invoice_dates']
                    })

                    var currentMissingInvDate = projectLookUp.custentity_clb_missing_invoice_dates ? projectLookUp.custentity_clb_missing_invoice_dates : '';
                    log.debug("Summarize", "currentMissingInvDate Before : " + currentMissingInvDate);
                    values.forEach(function (value) {
                        currentMissingInvDate = currentMissingInvDate.replace(value, "");
                    })
                    log.debug("Summarize", "currentMissingInvDate After : " + currentMissingInvDate);

                    var projectID = record.submitFields({
                        type: record.Type.JOB,
                        id: key,
                        values: {
                            "custentity_clb_missing_invoice_dates": currentMissingInvDate
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        }
                    });
                    log.debug("summarize: ", "projectID updated: " + projectID)


                });
            }

        }
        return {
            getInputData: getInputData,
            reduce: reduce,
            summarize: summarize
        };
    });