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
                    // queryStr = "SELECT resourceAllocation.allocationResource AS employee,billng_info.custrecord_blng_cyle,job.ID,job.custentity_clb_bilcycle,job.customer,billng_info.custrecord_bln_strt_dte,billng_info.custrecord_blng_end_dte,job.custentity_clb_projecttypeforinvoicing,job.parent,job.custentity_clb_missing_invoice_dates,resourceAllocation.startdate,resourceAllocation.enddate FROM job LEFT JOIN customrecord_clb_clientspecificbillingcy AS billng_info ON (billng_info.custrecord_blng_cyle = job.custentity_clb_bilcycle) LEFT JOIN resourceAllocation ON (job.id = resourceAllocation.project) WHERE (job.custentity_clb_projecttypeforinvoicing IN (1,2)) AND (job.custentity_clb_parentproject IS NULL) AND (job.custentity_clb_bilcycle IS NOT NULL) AND (resourceAllocation.startdate <= billng_info.custrecord_blng_end_dte AND resourceAllocation.enddate >= billng_info.custrecord_bln_strt_dte) AND job.id IN (51330,51684,51424)  AND billng_info.custrecord_bln_strt_dte >= '08/01/2023'"      
                    queryStr = "SELECT resourceAllocation.allocationResource AS employee,billng_info.custrecord_blng_cyle,job.ID,job.custentity_clb_bilcycle,job.customer,billng_info.custrecord_bln_strt_dte,billng_info.custrecord_blng_end_dte,job.custentity_clb_projecttypeforinvoicing,job.parent,job.custentity_clb_missing_invoice_dates,resourceAllocation.startdate,resourceAllocation.enddate FROM job LEFT JOIN customrecord_clb_clientspecificbillingcy AS billng_info ON (billng_info.custrecord_blng_cyle = job.custentity_clb_bilcycle) LEFT JOIN resourceAllocation ON (job.id = resourceAllocation.project) WHERE (job.custentity_clb_projecttypeforinvoicing IN (1,2,3)) AND (job.custentity_clb_parentproject IS NULL) AND (job.custentity_clb_bilcycle IS NOT NULL) AND (billng_info.custrecord_blng_end_dte='" + nsfrmDt + "') AND (job.startdate<= '" + nsfrmDt + "' ) AND (job.entitystatus IN (2)) AND (job.custentity_clb_nst_lst_invc_dte < '" + nsfrmDt + "' OR job.custentity_clb_nst_lst_invc_dte IS NULL) AND (resourceAllocation.startdate <= billng_info.custrecord_blng_end_dte AND resourceAllocation.enddate >= billng_info.custrecord_bln_strt_dte) AND (job.parent NOT IN(68658,69025,69026,69027,68659,69028,400371))"
                    // queryStr = "SELECT resourceAllocation.allocationResource AS employee,billng_info.custrecord_blng_cyle,job.ID,job.custentity_clb_bilcycle,job.customer,billng_info.custrecord_bln_strt_dte,billng_info.custrecord_blng_end_dte,job.custentity_clb_projecttypeforinvoicing,job.parent,job.custentity_clb_missing_invoice_dates,resourceAllocation.startdate,resourceAllocation.enddate FROM job LEFT JOIN customrecord_clb_clientspecificbillingcy AS billng_info ON (billng_info.custrecord_blng_cyle = job.custentity_clb_bilcycle) LEFT JOIN resourceAllocation ON (job.id = resourceAllocation.project) WHERE (job.custentity_clb_projecttypeforinvoicing IN (1,2)) AND (job.custentity_clb_parentproject IS NULL) AND (job.custentity_clb_bilcycle IS NOT NULL) AND (job.startdate<='04/09/2024' ) AND (resourceAllocation.startdate <= billng_info.custrecord_blng_end_dte AND resourceAllocation.enddate >= billng_info.custrecord_bln_strt_dte) AND job.ID IN (39457,58967,37042,70541,36897,37882,70545,39263,37163,36896,39447,37593,37834,37350,37220,37812,39087,37456,37518,59035,37313,37322,37000,58093,37242,37526,70561,37276,36930,37219,37567,38010,39579,39595,39607,39611,39659,37985,37418,37131,37899,37619,37878,37278,56409,37785,56431,39537,39531,70579,37123,70585,37095,39529,37768,37301,36805,39547,37679,37317,36947,39527,38015,39539,56518,45841,36929,39641,39309,37461,70595,37817,56541,56542,37240,39613,37569,37718,56605,37249,39627,37534,56617,56618,37266,56621,39555,37743,56637,56638,37855,37159,39585,56643,37459,56670,39669,39541,70603,37954,56680,37875,56688,39679,39543,37767,37700,39201,39473,37231,37071,37419,37515,37269,37842,39601,36860,37273,45852,39617,37927,36937) AND billng_info.custrecord_blng_end_dte <= '03/03/2024'";    
                    //queryStr = "SELECT resourceAllocation.allocationResource AS employee,billng_info.custrecord_blng_cyle,job.ID,job.custentity_clb_bilcycle,job.customer,billng_info.custrecord_bln_strt_dte,billng_info.custrecord_blng_end_dte,job.custentity_clb_projecttypeforinvoicing,job.parent,job.custentity_clb_missing_invoice_dates,resourceAllocation.startdate,resourceAllocation.enddate FROM job LEFT JOIN customrecord_clb_clientspecificbillingcy AS billng_info ON (billng_info.custrecord_blng_cyle = job.custentity_clb_bilcycle) LEFT JOIN resourceAllocation ON (job.id = resourceAllocation.project) WHERE (job.custentity_clb_projecttypeforinvoicing IN (1,2)) AND (job.custentity_clb_parentproject IS NULL) AND (job.custentity_clb_bilcycle IS NOT NULL) AND (job.startdate<='04/09/2024' ) AND (resourceAllocation.startdate <= billng_info.custrecord_blng_end_dte AND resourceAllocation.enddate >= billng_info.custrecord_bln_strt_dte) AND job.ID IN (36984,36992,37050,37157,37241,37300,37519,37615,37750,37851,39037,39189,39255,39433,39435,39605,39637,39661,45850,56375,56415,56427,56462,56551,56611,69815,69816) AND billng_info.custrecord_blng_end_dte <= '03/03/2024'"
                } else if (deploymentID == 'customdeploy_asc_mr_adhoc') {
                    //queryStr = "SELECT resourceAllocation.allocationResource AS employee,billng_info.custrecord_blng_cyle,job.ID,job.custentity_clb_bilcycle,job.customer,billng_info.custrecord_bln_strt_dte,billng_info.custrecord_blng_end_dte,job.custentity_clb_projecttypeforinvoicing,job.parent,job.custentity_clb_missing_invoice_dates,resourceAllocation.startdate,resourceAllocation.enddate FROM job LEFT JOIN customrecord_clb_clientspecificbillingcy AS billng_info ON (billng_info.custrecord_blng_cyle = job.custentity_clb_bilcycle) LEFT JOIN resourceAllocation ON (job.id = resourceAllocation.project) WHERE (job.custentity_clb_projecttypeforinvoicing IN (1,2,3)) AND (job.custentity_clb_parentproject IS NULL) AND (job.custentity_clb_bilcycle IS NOT NULL) AND (job.custentity_clb_missing_invoice_dates IS NULL) AND (billng_info.custrecord_blng_end_dte >='09/01/2024') AND (billng_info.custrecord_blng_end_dte <='09/10/2024') AND (job.custentity_clb_projct_end_dte>= '09/01/2024' ) AND (resourceAllocation.startdate <= billng_info.custrecord_blng_end_dte AND resourceAllocation.enddate >= billng_info.custrecord_bln_strt_dte)";
                    //queryStr = "SELECT resourceAllocation.allocationResource AS employee,billng_info.custrecord_blng_cyle,job.ID,job.custentity_clb_bilcycle,job.customer,billng_info.custrecord_bln_strt_dte,billng_info.custrecord_blng_end_dte,job.custentity_clb_projecttypeforinvoicing,job.parent,job.custentity_clb_missing_invoice_dates,resourceAllocation.startdate,resourceAllocation.enddate FROM job LEFT JOIN customrecord_clb_clientspecificbillingcy AS billng_info ON (billng_info.custrecord_blng_cyle = job.custentity_clb_bilcycle) LEFT JOIN resourceAllocation ON (job.id = resourceAllocation.project) WHERE (job.custentity_clb_projecttypeforinvoicing IN (1,2,3)) AND (job.custentity_clb_parentproject IS NULL) AND (job.custentity_clb_bilcycle IS NOT NULL)  AND (billng_info.custrecord_blng_end_dte >='01/27/2025') AND (billng_info.custrecord_blng_end_dte <='02/28/2025')  AND (job.startdate <='03/09/2025') AND (resourceAllocation.startdate <= billng_info.custrecord_blng_end_dte AND resourceAllocation.enddate >= billng_info.custrecord_bln_strt_dte) AND (Job.ID IN(102946,103047,103048,103049,103050,103051,103054,103055,103056,103057,103058,103060,103062,103063,103148,105194,105195,105196,105198,105199,105200,105201,105203,105204,105205,105206,105207,105208,105209,105210,105212,105213,105214,105215,105216,105218,105219,105220,105221,105346,105347,105348,105349,105350,105351,105352,105353,105357,105359,105360,105361,105362,105364,105366,105369,105370,105371,105372,105375,105377,105378,105380,105382,105383,105384,105385,105388,105390,105391,105392,105394,105395,105396,105397,105399,105400,105402,105403,105404,105406,105407,105408,105409,105410,105411,105412,105413,105415,105416,105417,105418,105419,105422,105423,105424,105425,105426,105427,105429,105431,105433,105434,105435,105437,105438,105439,105440,105441,105442,105443,105444,105446,105449,105450,105452,105453,105455,105456,105457,105458,105460,105461,105463,105464,105465,105467,105468,105469,105470,105472,105473,105476,105477,105478,105479,105481,105483,105484,105485,105486,105488,105490,105491,105492,105494,105495,105496,105498,105499,105500,105501,105502,105503,105504,105505,105506,105507,105508,105510,105511,105513,105515,105516,105519,105520,105521,105522,105523,105524,105525,105526,105527,105528,105529,105530,105531,105535,105536,105537,105538,105540,105541,105542,105543,105645,105654,105662,105665,105666,105669,105671,105672,105674,105675,105677,105678,105680,105681,105683,105685,105686,105687,105695,105696,105700,105701,105702,105703,105705,105706,105709,105710,105711,105713,105714,105715,105716,105717,105729,105745,105750,105751,105752,105755,105760,105778,105793,105797,105798,105813,105824,105832,105834,105836,105838,105841,105842,105844,105945,105946,105947,105948,105950,105951,105952,105955,105958,105959,105960,105965,105967,105968,105969,105984,105987,106145,106149,106150,106151,106152,106156,106157,106158,106160,106161,106164,106165,106166,106168,106170,106172,106173,106174,106175,106176,106177,106178,106179,106180,106181,106184,106185,106186,106187,106192,106194,106196,106198,106199,106200,106201,106202,106203,106204,106206,106207,106211,106212,106213,106220,106222,106226,106227,106229,106256,106263,106273,106298,106469,106478,106496,106508,106520,106521,106523,106525,106537,106538,106539,106547,106562,106568,106570,106579,106582,106588,106589,106595,106599,106606,106607,106609,106625,106626,106628,106631,106632,106633,106634,106635,106640,106641,106642,106644,106645,106646,106647,106648,106655,106658,106659,106662,106664,106680,106682,106686,106691,106692,106697,106699,106702,106715,106716,106720,106851,106852,106853,106856,106857,106859,106863,106865,106872,106886,106888,106893,106894,106898,106901,106902,106907,106912,106916,106918,106921,106924,106925,106926,106928,106929,106932,106934,106935,106936,106939,106941,107053,107054,107060,107063,107065,107067,107068,107070,107072,107074,107075,107076,107078,107084,107085,107088,107097,107101,107103,107104,107105,107109,107110,107116,107120,107121,107122,107125,107126,107127,107128,107130,107131,107137,107141,107144,107145,107146,107147,107153,107161,107166,107171,107173,107175,107177,107178,107179,107181,107182,107183,107186,107189,107191,107194,107196,107200,107201,107202,107203,107205,107206,107207,107208,107210,107213,107214,107215,107216,107217,107218,107220,107224,107225,107227,107228,107231,107232,107233,107240,107242,107245,107246,107247,107248,107250,107251,107252,107253,107254,107255,107256,107257,107258,107260,107263,107264,107266,107268,107273,107274,107275,107276,107277,107278,107279,107281,107282,107283,107284,107285,107286,107287,107288,107290,107291,107292,107293,107294,107295,107296,107297,107299,107300,107301,107302,107303,107305,107306,107307,107308,107310,107311,107312,107313,107314,107315,107316,107317,107318,107319,107320,107321,107322,107323,107324,107325,107326,107327,107328,107329,107330,107332,107333,107334,107335,107336,107337,107338,107339,107340,107341,107343,107344,107445,107446,107447,107448,107449,107452,107453,107454,107456,107457,107458,107459,107460,107463,107464,107466,107468,107470,107472,107473,107476,107477,107478,107479,107481,107482,107483,107484,107485,107486,107487,107489,107490,107545,107546,107547,107548,107550,107551,107552,107553,107554,107555,107556,107557,107558,107560,107561,107563,107564,107566,107567,107568,107569,107570,107571,107573,107574,107576,107578,107579,107581,107582,107583,107584,107585,107586,107588,107589,107591,107592,107593,107594,107595,107596,107597,107598,107599,107601,107602,107603,107604,107606,107607,107609,107612,107613,107614,107615,107616,107617,107618,107620,107622,107623,107624,107625,107626,107627,107628,107629,107630,107632,107633,107634,107635,107637,107638,107639,107640,107641,107643,107646,107648,107649,107650,107651,107653,107654,107655,107656,107657,107658,107659,107660,107661,107664,107667,107670,107672,107673,107674,107675,107677,107679,107681,107682,107683,107684,107685,107686,107688,107690,107691,107692,107693,107695,107696,107698,107699,107702,107703,107704,107706,107707,107708,107709,107710,107712,107714,107715,107716,107717,107719,107720,107721,107723,107724,107725,107726,107727,107728,107732,107733,107734,107736,107737,107738,107739,107741,107742,107743,107744,107745,107746,107747,107748,107749,107750,107751,107752,107753,107754,107755,107757,107758,107759,107760,107761,107762,107763,107764,107765,107766,107767,107768,107769,107770,107771,107772,107773,107775,107776,107778,107779,107781,107782,107783,107784,107785,107786,107787,107788,107789,107791,107792,107793,107794,107796,107797,107798,107799,107800,107801,107802,107803,107805,107806,107807,107808,107809,107810,107811,107812,107813,107814,107815,107817,107818,107819,107820,107821,107822,107823,107825,107826,107827,107828,107829,107830,107832,107834,107835,107836,107837,107838,107839,107840,107841,107842,107843,107847,107848,107849,107850,107851,107852,107853,107854,107855,107857,107858,107859,107860,107861,107863,107864,107865,107866,107868,107869,107870,107871,107872,107873,107874,107875,107876,107877,107878,107879,107880,107881,107882,107883,107886,107887,107888,107889,107890,107891,107894,107895,107896,107897,107898,107899,107900,107901,107902,107903,107904,107905,107906,107907,107908,107909,107910,107911,107912,107913,107915,107916,107917,107918,107919,107920,107921,107922,107923,107924,107925,107926,107927,107928,107929,107930,107931,107932,107933,107934,107935,107936,107937,107938,107939,107940,107941,107942,107943,107944,107945,107946,107947,107948,107949,107951,107952,107953,107954,107955,107956,107958,107959,107960,107961,107962,107964,107965,107966,107967,107968,107969,107970,107971,107972,107973,107974,107975,107976,107977,107979,107981,107982,107983,107984,107985,107986,107987,107989,107990,107991,107992,107993,107994,107995,107996,107997,107998,107999,108000,108001,108002,108005,108006,108007,108008,108009,108010,108011,108245,108745,108849,108945,108946,108947,108948,108950,108951,108952,108953,108954,108955,108956,109045,109046,109047,109048,109049,109050,109052,109053,109145,109146,109147,109148,109149,109150,109151,109152,109153,109155,109156,109157,109159,109160,109161,109162,109163,109165,109166,109171,109172,109173,109174,109175,109176,109177,109178,109179,109180,109181,109182,109183,109184,109185,109186,109189,109190,109191,109192,109193,109194,109195,109196,109197,109198,109199,109200,109201,109202,109204,109205,109206,109207,109208,109209,109210,109213,109215,109245,109246,109248,109249,109252,109253,109255,109257,109259,109260,109262,109264,109265,109266,109268,109269,109270,109275,109276,109277,109278,109280,109282,109283,109284,109285,109286,109290,109292,109294,109300,109302,109303,109317,109321,109327,109328,109329,109330,109331,109333,109335,109337,109340,109342,109343,109348,109354,109356,109360,109362,109367,109375,109376,109378,109383,109385,109386,109387,109389,109394,109395,109396,109398,109399,109401,109402,109405,109406,109408,109409,109410,109412,109414,109415,109416,109417,109418,109419,109421,109422,109423,109424,109425,109426,109427,109428,109435,109436,109437,109438,109439,109441,109443,109444,109445,109446,109448,109449,109450,109452,109454,109457,109458,109460,109462,109464,109465,109466,109467,109468,109469,109470,109471,109474,109476,109477,109478,109479,109484,109485,109486,109487,109490,109491,109494,109495,109496,109499,109500,109503,109505,109506,109508,109509,109510,109512,109517,109518,109520,109545,109547,109549,109550,109551,109646,109647,109649,109650,109651,109652,109653,109655,109656,109657,109658,109659,109661,109662,109663,109664,109665,109666,109667,109671,109672,109673,109676,109745,109746,109747,109748,109846,109847,109848,109851,109853,109945,109948,109951,109952,109953,109954,109955,109956,109957,109959,109960,109961,109963,109964,109965,109966,109967,109969,109970,109971,109975,109976,109977,109978,109979,109981,110046,110053,110055,110056,110057,110058,110060,110063,110069,110071,110073,110074,110076,110077,110079,110081,110084,110085,110086,110087,110088,110089,110090,110091,110096,110098,110099,110103,110105,110106,110107,110108,110110,110111,110113,110115,110121,110122,110127,110131,110132,110133,110134,110135,110137,110138,110139,110140,110143,110145,110147,110152,110153,110155,110156,110158,110169,110170,110173,110177,110178,110179,110180,110187,110201,110206,110213,110217,110219,110222,110223,110224,110226,110231,110234,110236,110238,110239,110251,110262,110267,110292,110293,110295,110299,110304,110324,110327,110330,110332,110333,110334,110335,110340,110341,110343,110344,110345,110346,110347,110348,110349,110350,110351,110352,110353,110355,110356,110357,110358,110359,110360,110362,110363,110364,110367,110370,110371,110372,110374,110378,110382,110383,110385,110386,110387,110388,110397,110399,110400,111047,111655,111956,112560,112761,112763,112861,112862,112863,113061,113063,113066,113861,113862,114063,114467,115170,115269,115669,115670,115869,115871,115872,115969,115970,116271))"; //AND (job.custentity_clb_missing_invoice_dates is NULL)
                      queryStr = "SELECT resourceAllocation.allocationResource AS employee,billng_info.custrecord_blng_cyle,job.ID,job.custentity_clb_bilcycle,job.customer,billng_info.custrecord_bln_strt_dte,billng_info.custrecord_blng_end_dte,job.custentity_clb_projecttypeforinvoicing,job.parent,job.custentity_clb_missing_invoice_dates,resourceAllocation.startdate,resourceAllocation.enddate FROM job LEFT JOIN customrecord_clb_clientspecificbillingcy AS billng_info ON (billng_info.custrecord_blng_cyle = job.custentity_clb_bilcycle) LEFT JOIN resourceAllocation ON (job.id = resourceAllocation.project) WHERE (job.custentity_clb_projecttypeforinvoicing IN (1,2,3)) AND (job.custentity_clb_parentproject IS NULL) AND (job.custentity_clb_bilcycle IS NOT NULL)  AND (billng_info.custrecord_blng_end_dte >='03/03/2025') AND (billng_info.custrecord_blng_end_dte <='03/09/2025')  AND (job.startdate <='04/09/2025') AND (resourceAllocation.startdate <= billng_info.custrecord_blng_end_dte AND resourceAllocation.enddate >= billng_info.custrecord_bln_strt_dte) AND (job.entitystatus IN (2)) AND Job.ID IN(124389)";
                    // queryStr = "SELECT resourceAllocation.allocationResource AS employee,billng_info.custrecord_blng_cyle,job.ID,job.custentity_clb_bilcycle,job.customer,billng_info.custrecord_bln_strt_dte,billng_info.custrecord_blng_end_dte,job.custentity_clb_projecttypeforinvoicing,job.parent,job.custentity_clb_missing_invoice_dates,resourceAllocation.startdate,resourceAllocation.enddate FROM job LEFT JOIN customrecord_clb_clientspecificbillingcy AS billng_info ON (billng_info.custrecord_blng_cyle = job.custentity_clb_bilcycle) LEFT JOIN resourceAllocation ON (job.id = resourceAllocation.project) WHERE (job.custentity_clb_projecttypeforinvoicing IN (1,2,3)) AND (job.custentity_clb_parentproject IS NULL) AND (job.custentity_clb_bilcycle IS NOT NULL) AND (billng_info.custrecord_blng_end_dte >='04/26/2024') AND (billng_info.custrecord_blng_end_dte <='05/26/2024') AND (job.startdate<= '05/26/2024' ) AND (resourceAllocation.startdate <= billng_info.custrecord_blng_end_dte AND resourceAllocation.enddate >= billng_info.custrecord_bln_strt_dte)"
                } else {
                    queryStr = "SELECT resourceAllocation.allocationResource AS employee,job.ID,job.custentity_clb_bilcycle,job.customer,job.custentity_clb_projecttypeforinvoicing,job.parent,job.custentity_clb_missing_invoice_dates FROM job LEFT JOIN resourceAllocation ON (job.id = resourceAllocation.project) WHERE (job.custentity_clb_projecttypeforinvoicing IN (1,2,3)) AND (job.custentity_clb_parentproject IS NULL) AND (job.custentity_clb_missing_invoice_dates IS NOT NULL) AND (job.parent NOT IN(68658,69025,69026,69027,68659,69028,400371))";
                    //queryStr = "SELECT resourceAllocation.allocationResource AS employee,job.ID,job.custentity_clb_bilcycle,job.customer,job.custentity_clb_projecttypeforinvoicing,job.parent,job.custentity_clb_missing_invoice_dates FROM job LEFT JOIN resourceAllocation ON (job.id = resourceAllocation.project) WHERE (job.custentity_clb_projecttypeforinvoicing IN (1,2,4)) AND (job.custentity_clb_parentproject IS NULL) AND (job.custentity_clb_missing_invoice_dates IS NOT NULL) AND (job.id IN(460846))";
                }
                log.debug("getInputData : queryStr ", queryStr)
                if (queryStr) {
                    // var results = query.runSuiteQL({
                    //     query: queryStr
                    // });
                    // var projectDetails = results.asMappedResults();
                    // log.debug("project found: ", projectDetails.length)
                    //
                    var pagedResults = query.runSuiteQLPaged({
                        query: queryStr,
                        pageSize: 1000  // Set a reasonable page size
                    });
                    
                    var projectDetails = [];
                    pagedResults.pageRanges.forEach(function (pageRange) {
                        var page = pagedResults.fetch(pageRange.index);
                        projectDetails = projectDetails.concat(page.data.asMappedResults());
                    });
                    
                    log.debug("Total records fetched: ", projectDetails.length);
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
                                        //log.debug("values",values);
                                        projObj[key] = values;
                                        // log.debug("Hi",projObj)

                                    }
                                }
                                // log.debug("outside loop",projObj)
                                // return true;
                            }

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
                    columns: ['subsidiary', 'custentity_clb_missing_invoice_dates', ]
                });
                var missingInvoices = projectLookUp.custentity_clb_missing_invoice_dates ? projectLookUp.custentity_clb_missing_invoice_dates : '';
                log.debug("projectLookUp", projectLookUp)
                log.debug("reduce", "missingInvoices   " + missingInvoices)
               // log.debug("reduce", "projectWeekendingDay   " + projectWeekendingDay)
                var projSubsidiary = projectLookUp.subsidiary[0].value;
                var projectFilter = [];
                var projectType = projectDetails.custentity_clb_projecttypeforinvoicing;
                var createInvoiceCheck = false;
                var tranErr = false;
                //  log.debug("Reduce Stage: ", "Project Type: " + projectType);
                if (projSubsidiary == 4) {
                    if (projectType == 1 || projectType == 2 || projectType == 3) {
                        projectFilter.push(projectID);
                        if (deploymentID == 'customdeploy_asc_mr_timesheet_invoicing' || deploymentID == 'customdeploy_asc_mr_adhoc' ) {
                            var resStrt = projectDetails.startdate;
                            var resEnd = projectDetails.enddate;
                            if (new Date(resStrt) > new Date(billingStartDate)) {
                                billingStartDate = resStrt;
                            }
                            if (new Date(billingEndDate) > new Date(resEnd)) {
                                billingEndDate = resEnd;
                            }
                        }
                        log.debug('billingStartDate', billingStartDate);
                        log.debug('billingEndDate', billingEndDate);
                        weekendingDays = getDaysinPeriod(billingStartDate, billingEndDate);
                      //  weekendingDays = countWeekends(billingStartDate, billingEndDate, projectWeekendingDay)
                        var wkendinTime = checktsCount(projectID, billingStartDate, billingEndDate);
                        log.debug("Days in Cycle : Days in Time Track", "Weekend in period" + weekendingDays + " : " + "Weekend in timesheet" + wkendinTime);
                        if (wkendinTime >= weekendingDays) {
                            createInvoiceCheck = true;
                            log.debug("Reduce Stage: Create Invoice: ", createInvoiceCheck);
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
                                    end: 2
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
                    log.debug("createInvoiceCheck", createInvoiceCheck);
                    //------End Check Weekending dates------
                    //log.debug("projectFilter.length", projectFilter.length);
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
                                ["custcol_clb_invoice", "anyof", "@NONE@"],
                                "AND", 
                                ["item","anyof","307","308","315"],
                                "AND",
                                ["billable","is","T"]
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
                            log.debug("no split case")
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
                            if (invoiceTotal > 0) 
                             {
                                //log.debug("inv details 1", invoicingDetails);
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

                                        //searching the schedule record and attaching invoice
                                        log.debug("searching the schedule record and attaching invoice")
                                        var customrecord_asc_invbill_scheduleSearchObj = search.create({
                                            type: "customrecord_asc_invbill_schedule",
                                            filters:
                                            [
                                               ["custrecord_asc_schrec_project","anyof",projectID], 
                                               "AND", 
                                               ["custrecord_asc_schrec_startdate","on",billingStartDate], 
                                               "AND", 
                                               ["custrecord_asc_schrec_enddate","on",billingEndDate]
                                            ],
                                            columns:[]
                                            
                                         });
                                         var searchResultCount = customrecord_asc_invbill_scheduleSearchObj.runPaged().count;
                                         log.debug("customrecord_asc_invbill_scheduleSearchObj result count",searchResultCount);
                                         customrecord_asc_invbill_scheduleSearchObj.run().each(function(result){
                                            // .run().each has a limit of 4,000 results
                                            var scheId = record.submitFields({
                                                type: 'customrecord_asc_invbill_schedule',
                                                id: result.id,
                                                values: {
                                                    "custrecord_asc_schrec_invoice":invoiceID
                                                },
                                                options: {
                                                    enableSourcing: false,
                                                    ignoreMandatoryFields: true
                                                }
                                            });
                                            return true;
                                         });
                                         

                                        //schedule record update end
                                        var currentmissingDates = billingStartDate + ":" + billingEndDate + ",";
                                        if (deploymentID != "customdeploy_asc_mr_tnm_grp_msng_ts_inv") {
                                            //var invId = searchInvoice(projectID, billingStartDate, billingEndDate)
                                            // log.debug("invoice present 0", invId)
                                            if (missingInvoices && missingInvoices.indexOf(currentmissingDates) > -1) {
                                                //if (!invId) {
                                                var newMissingInvoices = missingInvoices.replace(currentmissingDates, '');
                                                log.audit("Setting missing date 1", newMissingInvoices)
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
                                                //}
                                                // else {
                                                //log.debug("invoice is already present for :" + billingStartDate + ":" + billingEndDate)
                                                //}

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
                                var invId = searchInvoice(projectID, billingStartDate, billingEndDate)
                                if(!invId)
                                {
                                log.error("Errot at Stage : Reduce function")
                                log.error("Transaction Failure Report creation")
                               // var errID = lib.trnsctnFailureRec(billingStartDate, billingEndDate, "Invoice Creation Failed because: Invoice total is 0 due to 0 hours or 0 bill rate", 1, projectID)
                               // log.error("Error in createInvoice: Created the Transaction Error ID", errID);
                               
                                
                                if (deploymentID != 'customdeploy_asc_mr_tnm_grp_msng_ts_inv') {
                                    var currentmissingDates = billingStartDate + ":" + billingEndDate + ",";
                                    log.debug("currentmissingDates", currentmissingDates)
                                    var newMissingDates = '';
                                    if (missingInvoices.indexOf(currentmissingDates) == -1) {
                                        // log.debug("Reduce stage:", "Dates are not present in the missing invoice field")
                                        newMissingDates = missingInvoices + currentmissingDates;
                                    }

                                    if (missingInvoices != newMissingDates && newMissingDates != '') {
                                        // log.debug("Reduce stage:", "missinginvoice setting on project: " + projectID)

                                        log.audit("Setting missing date 3", newMissingDates)
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
                                    }
                                }
                               }
                                  
                                
                            }
                        } else {
                            log.debug("split case")
                            var invoiceArray = [{
                                "invoiceTotal": 0
                            }, {
                                "invoiceTotal": 0
                            }];
                            // var invoicingDetails = {};

                            timebillSearchObj.run().each(function (result) {
                                var trackTimeID = result.id;
                                var taskID = result.getValue({ name: "internalid", join: "item" });
                                var hours = result.getValue("hours") ? result.getValue("hours") : 0;
                                var billRate = result.getValue("custcol_clb_billrate") ? result.getValue("custcol_clb_billrate") : 0;
                                var hoursDecimal = result.getValue("durationdecimal") ? result.getValue("durationdecimal") : 0;
                                var budget = result.getValue("custcol_asc_timesheet_task_budget") ? result.getValue("custcol_asc_timesheet_task_budget") : 0;
                                var tsdate = result.getValue("date");
                                // log.debug("tsdate" + tsdate +"- splitDate"+ splitDate)  
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
                            // log.debug("invoicingDetails",  JSON.stringify(invoicingDetails));
                            var podetailsSend = false;
                            // log.debug("invoicing Array", invoiceArray[0]);
                            // log.debug("invoicing Array[1]", invoiceArray[1]);
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
                                        log.debug("inv details 2", invoiceArray[inv]);
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
                                        // log.debug("inv details 3",invoiceArray[inv]);
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
                                    // log.error("Errot at Stage : Reduce function")
                                    // log.error("Transaction Failure Report creation")
                                    var errID;
                                    if (inv == 0) {
                                        var Yday= new Date(splitDate);
                                        Yday.setDate(Yday.getDate() - 1);
                                        var daybefore = ('0' + (Yday.getMonth() + 1)).slice(-2) + '/' +
                                            ('0' + Yday.getDate()).slice(-2) + '/' +
                                            Yday.getFullYear();
                                        var currentmissingDates = billingStartDate + ":" + daybefore + ",";
                                        log.debug("currentmissingDates", currentmissingDates);
                                        if (deploymentID != 'customdeploy_asc_mr_tnm_grp_msng_ts_inv') {
                                            // log.debug("Reduce Stage:", " Set Missing dates if not present in missingInvoices-   " + missingInvoices);
                                           // var currentmissingDates = billingStartDate + ":" + billingEndDate + ",";
                                            var invId = searchInvoice(projectID, billingStartDate, daybefore)
                                            log.debug("invoice present", invId)
                                            log.debug("currentmissingDates", currentmissingDates)
                                            var newMissingDates = '';
                                            if (missingInvoices.indexOf(currentmissingDates) == -1) {
                                                // log.debug("Reduce stage:", "Dates are not present in the missing invoice field")
                                                newMissingDates = missingInvoices + currentmissingDates;
                                            }

                                            if (missingInvoices != newMissingDates && newMissingDates != '') {
                                                // log.debug("Reduce stage:", "missinginvoice setting on project: " + projectID)
                                                if (!invId) {
                                                    log.audit("Setting missing dates", newMissingDates)
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
                                                    errID = lib.trnsctnFailureRec(billingStartDate, daybefore, "Invoice Creation Failed because: Invoice total is 0 due to 0 hours or 0 bill rate", 1, projectID)
                                                }
                                                else {
                                                    log.debug("invoice is already present for :" + billingStartDate + ":" + daybefore)
                                                }
                                            }
                                        } else {
            
                                        }
                                    } else {
                                        log.error("elsecondition")
                                        var currentmissingDates = splitDate + ":" + billingEndDate + ",";
                                        log.debug("currentmissingDates", currentmissingDates);
                                        if (deploymentID != 'customdeploy_asc_mr_tnm_grp_msng_ts_inv') {
                                            // log.debug("Reduce Stage:", " Set Missing dates if not present in missingInvoices-   " + missingInvoices);
                                           // var currentmissingDates = billingStartDate + ":" + billingEndDate + ",";
                                            var invId = searchInvoice(projectID, splitDate, billingEndDate)
                                            log.debug("invoice present", invId)
                                            log.debug("currentmissingDates", currentmissingDates)
                                            var newMissingDates = '';
                                            if (missingInvoices.indexOf(currentmissingDates) == -1) {
                                                // log.debug("Reduce stage:", "Dates are not present in the missing invoice field")
                                                newMissingDates = missingInvoices + currentmissingDates;
                                            }

                                            if (missingInvoices != newMissingDates && newMissingDates != '') {
                                                // log.debug("Reduce stage:", "missinginvoice setting on project: " + projectID)
                                                if (!invId) {
                                                    log.audit("Setting missing dates", newMissingDates)
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
                                                errID = lib.trnsctnFailureRec(splitDate, billingEndDate, "Invoice Creation Failed because: Invoice total is 0 due to 0 hours or 0 bill rate", 1, projectID)
                                                 }
                                                else {
                                                    log.debug("invoice is already present for :" + billingStartDate + ":" + billingEndDate)
                                                }
                                            }
                                        } else {
                                          
                                        }
                                        // errID = lib.trnsctnFailureRec(splitDate, billingEndDate, "Invoice Creation Failed because: Invoice total is 0 due to 0 hours or 0 bill rate", 1, projectID)
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
                                log.debug("searching the schedule record and attaching invoice")
                                var customrecord_asc_invbill_scheduleSearchObj = search.create({
                                    type: "customrecord_asc_invbill_schedule",
                                    filters:
                                    [
                                       ["custrecord_asc_schrec_project","anyof",projectID], 
                                       "AND", 
                                       ["custrecord_asc_schrec_startdate","on",billingStartDate], 
                                       "AND", 
                                       ["custrecord_asc_schrec_enddate","on",billingEndDate]
                                    ],
                                    columns:[]
                                    
                                 });
                                 var searchResultCount = customrecord_asc_invbill_scheduleSearchObj.runPaged().count;
                                 log.debug("customrecord_asc_invbill_scheduleSearchObj result count",searchResultCount);
                                 customrecord_asc_invbill_scheduleSearchObj.run().each(function(result){
                                    // .run().each has a limit of 4,000 results
                                    var scheId = record.submitFields({
                                        type: 'customrecord_asc_invbill_schedule',
                                        id: result.id,
                                        values: {
                                            "custrecord_asc_schrec_invoice":invoiceIDs[0],
                                        },
                                        options: {
                                            enableSourcing: false,
                                            ignoreMandatoryFields: true
                                        }
                                    });
                                    return true;
                                 });
                                
                                var currentmissingDates = billingStartDate + ":" + billingEndDate + ",";
                                if (deploymentID != "customdeploy_asc_mr_tnm_grp_msng_ts_inv") {
                                    //var invId = searchInvoice(projectID, billingStartDate, billingEndDate)
                                    //log.debug("invoice present 1", invId)
                                    if (missingInvoices && missingInvoices.indexOf(currentmissingDates) > -1) {
                                        //if (!invId) {
                                        var newMissingInvoices = missingInvoices.replace(currentmissingDates, '');
                                        log.audit("Setting missing date 2", newMissingInvoices)
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
                                        //}
                                        // else {
                                        //     log.debug("invoice is already present for :" + billingStartDate + ":" + billingEndDate)
                                        // }

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
                                var invId = searchInvoice(projectID, billingStartDate, billingEndDate)
                                log.debug("invoice present", invId)
                                log.debug("currentmissingDates", currentmissingDates)
                                var newMissingDates = '';
                                if (missingInvoices.indexOf(currentmissingDates) == -1) {
                                    // log.debug("Reduce stage:", "Dates are not present in the missing invoice field")
                                    newMissingDates = missingInvoices + currentmissingDates;
                                }

                                if (missingInvoices != newMissingDates && newMissingDates != '') {
                                    // log.debug("Reduce stage:", "missinginvoice setting on project: " + projectID)
                                    if (!invId) {
                                        log.audit("Setting missing date 3", newMissingDates)
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
                                    }
                                    else {
                                        log.debug("invoice is already present for :" + billingStartDate + ":" + billingEndDate)
                                    }

                                } else {
                                    //log.debug("Reduce stage:", "Missing Invoice Dates are already present on project: " + projectID)
                                }
                            } else {
                                var invoiceId = searchInvoice(projectID, billingStartDate, billingEndDate)
                                log.debug("invoice present", invoiceId)
                                if (!invoiceId) {
                                    var errID = lib.trnsctnFailureRec(billingStartDate, billingEndDate, "Invoice Creation Failed due missing timesheet", 1, projectID)
                                }
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
                log.debug("invoicingDetails length", invoicingDetails.length);
                log.debug("invoice creation function for the customer: " + customerID, "Project Type: " + projectType + "  Project ID: " + projectID);
                var invoiceObj = record.create({ type: 'invoice', isDynamic: true });
                invoiceObj.setValue("entity", customerID);
                invoiceObj.setValue("custbody_clb_projecttypeapproval", projectType);
                invoiceObj.setValue("job", projectID);
                invoiceObj.setValue("custbody_asc_inv_project_selected", projectID);
                //invoiceObj.setValue("trandate", new Date('09/30/2024'));
                invoiceObj.setValue("taxdetailsoverride", true);
                var customerAddress = getCustomerAddresses(customerID);
                customerAddress = customerAddress.length > 0 ? customerAddress[0] : "";
                if (projectType == 1 || projectType == 2) {
                    invoiceObj.setValue({ fieldId: 'customform', value: 163, ignoreFieldChange: true });
                }
                if (customerPOInfo != true) {
                    var poStartDate = new Date(customerPOInfo.getValue("custrecord_asc_cpd_start_date"));
                    var poEndDate = new Date(customerPOInfo.getValue("custrecord_asc_cpd_end_date"));

                    // if (poStartDate < new Date(billingStartDate)) {
                    //     invoiceObj.setValue("custbody_clb_periodstartingdate", poStartDate);
                    // }
                    // else {
                        invoiceObj.setValue("custbody_clb_periodstartingdate", new Date(billingStartDate));
                   // }
                    // if (poEndDate < new Date(billingEndDate)) {
                    //     invoiceObj.setValue("custbody_clb_periodendingdate", poEndDate);
                    // }
                    // else {
                        invoiceObj.setValue("custbody_clb_periodendingdate", new Date(billingEndDate));
                   // }
                    invoiceObj.setValue("startdate", poStartDate);
                    invoiceObj.setValue("enddate", poEndDate);
                    invoiceObj.setValue("otherrefnum", customerPOInfo.getValue("custrecord_asc_cpd_cust_po_num"));

                    if (customerPOInfo.getValue("custrecord_asc_cpd_country")[0]) //&&customerPOInfo.getValue("custrecord_asc_cpd_state")[0]&&customerPOInfo.getValue("custrecord_asc_cpd_city")&&customerPOInfo.getValue("custrecord_asc_cpd_billing_address")
                    {
                        var subrec = invoiceObj.getSubrecord({ fieldId: 'shippingaddress' });
                        var country = customerPOInfo.getText("custrecord_asc_cpd_country");
                        subrec.setText({ fieldId: 'country', value: country });
                        var state = customerPOInfo.getValue("custrecord_asc_cpd_state") ? customerPOInfo.getValue("custrecord_asc_cpd_state") : customerAddress.state;
                        subrec.setValue({ fieldId: 'state', value: state ? state : country });
                        var city = customerPOInfo.getValue("custrecord_asc_cpd_city") ? customerPOInfo.getValue("custrecord_asc_cpd_city") : customerAddress.city;
                        subrec.setValue({ fieldId: 'city', value: city ? city : country });
                        var addr1 = customerPOInfo.getValue("custrecord_asc_cpd_billing_address") ? customerPOInfo.getValue("custrecord_asc_cpd_billing_address") : customerAddress.addr1;
                        subrec.setValue({ fieldId: 'addr1', value: addr1 ? addr1 : country });
                        var addr2 = customerPOInfo.getValue("custrecord_asc_cpd_billing_address_2") ? customerPOInfo.getValue("custrecord_asc_cpd_billing_address_2") : customerAddress.addr2;
                        subrec.setValue({ fieldId: 'addr2', value: addr2 ? addr2 : country });
                        var zip = customerPOInfo.getValue("custrecord_asc_cpd_zip") ? customerPOInfo.getValue("custrecord_asc_cpd_zip") : customerAddress.zip;
                        subrec.setValue({ fieldId: 'zip', value: zip ? zip : country });
                    }
                    var salesTax = customerPOInfo.getValue("custrecord_asc_cpd_sales_tax");
                    if (salesTax) {
                        var salesTaxLookup = search.lookupFields({
                            type: "customrecord_clb_taxgroup",
                            id: salesTax,
                            columns: ['custrecord_asc_taxcode_isgroup']
                        });
                        log.debug("salesTaxLookup", salesTaxLookup);
                        if (salesTaxLookup.custrecord_asc_taxcode_isgroup == true) {
                            invoiceObj.setValue("custbody_clb_applicable_tax_group", salesTax);
                        }
                        else {
                            invoiceObj.setValue("custbody_clb_applicable_tax_code", salesTax);
                        }
                    }
                }
                else {
                    log.debug("inside else part")
                    invoiceObj.setValue("custbody_clb_periodendingdate", new Date(billingEndDate))
                    invoiceObj.setValue("custbody_clb_periodstartingdate", new Date(billingStartDate))
                }
                var timeSheetconsolidatedIDs = [];
                Object.keys(invoicingDetails).forEach(function (key) {
                    log.debug("InvoicingDetails: 1 ", JSON.stringify(invoicingDetails));
                    if (key != 'invoiceTotal') {
                        log.debug('Key : ' + key, 'Value : ' + JSON.stringify(invoicingDetails[key]));
                        var trackTimeDetails = invoicingDetails[key];
                        var trackTimeIDs = trackTimeDetails["tracktimeId"];
                        var timeRate = trackTimeDetails["billRate"];
                        log.debug("Invoice creation Function: ", trackTimeIDs.length + " : " + timeRate)
                        var count = 0;
                        for (var tt = 0; tt < trackTimeIDs.length; tt++) {
                            var linenum = invoiceObj.findSublistLineWithValue({ sublistId: 'time', fieldId: 'doc', value: trackTimeIDs[tt] });
                            timeSheetconsolidatedIDs.push(trackTimeIDs[tt])
                            //log.debug("linenum of trackTimeIDs[tt] ", trackTimeIDs[tt] + "is:" + linenum)
                            if (linenum > -1) {
                                count++;
                                invoiceObj.selectLine({ sublistId: 'time', line: linenum });
                                invoiceObj.setCurrentSublistValue({ sublistId: 'time', fieldId: 'apply', value: true });
                                invoiceObj.setCurrentSublistValue({ sublistId: 'time', fieldId: 'rate', value: timeRate[tt] });
                                invoiceObj.commitLine({ sublistId: 'time' });
                            }
                        }
                       // log.debug("count", count);
                    }
                });
                var invAmount = invoiceObj.getValue("total");
                // log.debug("Invoice obj: ", invoiceObj)
                if (invAmount > 0) {
                    var invoiceID = invoiceObj.save({ enableSourcing: false, ignoreMandatoryFields: true });
                    log.debug("invoice created",invoiceID)
                    log.debug("timeSheetconsolidatedIDs: timeSheetconsolidatedIDs.length", timeSheetconsolidatedIDs.length + " : " + timeSheetconsolidatedIDs.length)
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
                            });
                        }
                    }
                    return invoiceID;
                }
                else {
                    var e = {};
                    e.message = "No Timesheets with hours more than 0 found or No Bill Rate found for the period dates."
                    throw e;
                }
            }
            catch (e) {
                log.error("Errot at Stage : createInvoice function", e)
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
        function searchInvoice(project, periodStartDate, periodEndDate) {
            var id = '';
            search.create({
                type: "invoice",
                filters: [
                    ["type", "anyof", "CustInvc"], "AND",
                    ["mainline", "is", "T"], "AND",
                    ["custbody_clb_periodstartingdate", "on", periodStartDate], "AND",
                    ["custbody_clb_periodendingdate", "on", periodEndDate], "AND",
                    ["custbody_asc_inv_project_selected", "anyof", project]
                ],
                columns: [
                    search.createColumn({ name: "internalid", label: "Internal ID" })
                ]
            }).run().each(function (result) {
                // .run().each has a limit of 4,000 results
                id = result.getValue({ name: "internalid" });
                return true;
            });
            return id;
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
        function countWeekends(startDate, endDate, weekendDay) {
            // Convert startDate and endDate to Date objects
            let start = new Date(startDate);
            let end = new Date(endDate);

            // Get the weekend day number (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
            let weekendDayNumber = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(weekendDay);

            // Initialize the weekend count
            let weekendCount = 0;
            let lastWeekend = null;

            // Loop through the date range
            let current = new Date(start);
            while (current <= end) {
                // Check if the current date is the weekend day
                if (current.getDay() === weekendDayNumber) {
                    weekendCount++;
                    lastWeekend = new Date(current); // Store the last weekend date
                }
                // Move to the next day
                current.setDate(current.getDate() + 1);
            }

            // Check if there are remaining days after the last weekend but before the end date
            if (lastWeekend && lastWeekend < end) {
                // Calculate the next weekend after the last one
                let nextWeekend = new Date(lastWeekend);
                nextWeekend.setDate(lastWeekend.getDate() + 7);

                // If the next weekend doesn't exceed the end date, add it to the count
                if (nextWeekend > end) {
                    weekendCount++;
                }
            }
            if (weekendCount == 0) {
                weekendCount = 1;
            }

            return weekendCount;


        }

        function checkBudget(billingStartDate, billingEndDate, projectID, invoicingDetails, currentInvoiceTotal, customerPODetails) {
            try {
                log.audit("CheckBudget Function: ");
                //log.debug("CheckBudget Function: ", "billingStartDate:billingEndDate:projectID  :  " + billingStartDate + ":" + billingEndDate + ":" + projectID)
                var ignoreBudget = false;
                //  log.debug("CheckBudget Function: ", "ignorebudget initial Value : " + ignoreBudget)

                // log.debug("CheckBudget Function: ", "customerPODetails  " + JSON.stringify(customerPODetails))
                if (customerPODetails) {
                    ignoreBudget = customerPODetails.getValue("custrecord_asc_cpd_ignore_budget");
                    //log.debug("CheckBudget Function: ", "ignoreBudget " + ignoreBudget)
                    var customerPOstartDate = customerPODetails.getValue('custrecord_asc_cpd_start_date');
                    var customerPOEndDate = customerPODetails.getValue('custrecord_asc_cpd_end_date');
                    if (!ignoreBudget) {
                        singleBudget = customerPODetails.getValue("custrecord_asc_cpd_single_budget");
                        // log.debug("CheckBudget Function: ", "singleBudget: " + singleBudget)
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

            } catch (error) {

            }


        }

        function checktsCount(projectFilter, billingStartDate, billingEndDate) {
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
                    // search.createColumn({
                    //     name: "custcol_clb_weekendingdate",
                    //     label: "Week Ending Date"
                    // }),
                    //,
                    search.createColumn({
                        name: "date",
                        summary: "GROUP"
                    })
                ]
            });
            wkendinTime = trackTimeObj.runPaged().count;
            log.debug("Reduce Stage: Weekending Dates In Time track", wkendinTime);
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
                    else{
                        missingInvObj[key].push(value);
                    }
                    return true;
                })
                log.debug("Summarize", "missingOnvObj : " + JSON.stringify(missingInvObj));
                Object.keys(missingInvObj).forEach(function (key) {

                    var values = missingInvObj[key];
                    //log.debug("values",values);
                    var projectLookUp = search.lookupFields({
                        type: "job",
                        id: key,
                        columns: ['custentity_clb_missing_invoice_dates']
                    })

                    var currentMissingInvDate = projectLookUp.custentity_clb_missing_invoice_dates ? projectLookUp.custentity_clb_missing_invoice_dates : '';
                    log.debug("Summarize", "currentMissingInvDate Before : " + currentMissingInvDate);
                    values.forEach(function (value) {
                        //log.debug("value",value);
                        value.replace(",","")
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

        function getCustomerAddresses(customerId) {
            var addresses = [];
            try {
                var customerSearchObj = search.create({
                    type: "customer",
                    filters:
                        [
                            ["internalid", "anyof", "68806"]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "address", label: "Address" }),
                            search.createColumn({ name: "city", label: "City" }),
                            search.createColumn({ name: "state", label: "State/Province" }),
                            search.createColumn({ name: "zipcode", label: "Zip Code" }),
                            search.createColumn({ name: "country", label: "Country" }),
                            search.createColumn({ name: "address1", label: "Address 1" }),
                            search.createColumn({ name: "address2", label: "Address 2" })
                        ]
                });
                var searchResultCount = customerSearchObj.runPaged().count;
                //  console.log("customerSearchObj result count",searchResultCount);
                customerSearchObj.run().each(function (result) {
                    var address = {
                        // internalid: result.getValue({ name: 'addressinternalid' }),
                        label: result.getValue({ name: 'addresslabel' }),
                        addr1: result.getValue({ name: 'address1' }),
                        addr2: result.getValue({ name: 'address2' }),
                        city: result.getValue({ name: 'city' }),
                        state: result.getValue({ name: 'state' }),
                        zip: result.getValue({ name: 'zipcode' }),
                        country: result.getValue({ name: 'country' })
                    };

                    addresses.push(address);
                    return true;  // Continue iteration
                });
            } catch (e) {
                log.error({
                    title: 'Error fetching customer addresses',
                    details: e
                });
            }

            return addresses;
        }
        return {
            getInputData: getInputData,
            reduce: reduce,
            summarize: summarize
        };
    });