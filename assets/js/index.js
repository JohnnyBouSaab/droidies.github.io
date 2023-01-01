
var DATA_SCORES; var DATA_TRAITS; var DATA = {};

var link = new PhantasmaLink(CONTRACT_NAME); 
var linkVersion = 2; 

// CONNECTED USER INFO
var SOUL_BALANCE; 
var NAME; 
var ADDRESS;
var DROIDIES; // IDs of droidies the user has


$(document).ready(loaded);


function loaded() {
	
	// button handlers
	$('.search-droidy button').on('click', search_droidy);
	$('#droidNum').on('input', search_updated);
	$(".connectWalletButton").on('click', connectWalletHandler);
	$('#connectWalletButton').on('click', function(){connectAlert(false);});
	$("#mintButton").on('click', mintHandler);
	$('.add').on('click', updatePrice);
	$('.sub').on('click', updatePrice);
	$('#logout').on('click', handleLogout);
	$('.dropdown-item').on('click', function(e){e.stopPropagation();});
	$('.dropdown-item a').on('click', function(e){$('#droidies-owned').modal('show');});
	$('#gif').on('error', function(){$('#gif').attr('src', './assets/img/gif1-opt.gif');});

	// check connected state
	link.account ? handleLogin() : handleLogout();

}


// search operations

var rg = RegExp('^[0-9]+$|#[0-9]+$|droidy #[0-9]+$');
var int_rg = RegExp('[0-9]+$');

function search_droidy() {
	searching_icon(true);
	searchAlert(false);
	clear_table();
	let droidy_num = $('#droidNum').val().trim();
	let match = rg.exec(droidy_num)[0];
	let droid_id = parseInt(int_rg.exec(match)[0], 10);
	// console.log(droid_id);
	if(droid_id > TOTAL_SUPPLY || droid_id == 0) {
		searchAlert(true, 'Wrong droidy number :( ');
		searching_icon(false);
	} else {

		// Fetch droidy info if not loaded
		if(!DATA_SCORES) {
			console.log("loading scores")
			fetch(RARITY_DATA_URL + 'scores_standard_ordered') .then(response => {
				if(response.ok) {
					response.json().then(function(data_scores){
						DATA_SCORES = data_scores;
						if(!DATA_TRAITS) {
							console.log("loading traits")
							fetch(RARITY_DATA_URL + 'TRAIT_TO_NUM') .then(response => {
								if(response.ok) {
									response.json().then(function(data_traits){
										DATA_TRAITS = data_traits;
										data_loaded(droid_id);
									});
								} else {
									console.log('Failed to fetch traits: ' + response);
									searchAlert(true, 'Something went wrong :( try again in a bit');
									searching_icon(false);
								}
							}).catch(error => {
								console.log("Could not fetch data: " + error);
								searchAlert(true, 'Something went wrong, check connection and try again');
								searching_icon(false);
							});
						} else {
							data_loaded(droid_id);
						}
					});
				} else {
					console.log('Failed to fetch scores: ' + response);
					searchAlert(true, 'Something went wrong :( try again in a bit');
					searching_icon(false);
				}
			}) .catch(error => {
				console.log("Could not fetch data: " + error);
				searchAlert(true, 'Something went wrong, check connection and try again');
				searching_icon(false);
			});
		} else {
			data_loaded(droid_id);
		}

	}
	
}

function data_loaded(did) {
	let droid_score = DATA_SCORES['Droidy #' + did];
	let droid_rank = findRank('Droidy #' + did);
	// fetch droidy traits to update table
	if(!DATA[did]) {
		console.log("loading droidy stats");
		fetch(METADATA_URL + did).then(response => {
			if(response.ok) {
				response.json().then(function(data) {
					DATA[did] = data;
					update_table(droid_score, droid_rank, did);
				});
			} else {
				console.log('Failed to fetch droidy metadata: ' + response);
				searchAlert(true, 'Something went wrong :( try again in a bit');
				searching_icon(false);
			}
		}).catch(error => {
				console.log("Could not fetch data: " + error);
				searchAlert(true, 'Something went wrong, check connection or try again in a bit');
				searching_icon(false);
		});
	} else {
		update_table(droid_score, droid_rank, did);
	}
}

function update_table(droid_score, droid_rank, did) {
	$("figcaption[name=score]").text("Score: " + Math.round(droid_score*100)/100);
	$("figcaption[name=rank]").text("Rank: " + droid_rank + "/" + TOTAL_SUPPLY);
	$("img[name=droidy_searched_img]").attr('src', IMAGES_URL + did + ".png");
	DATA[did]['attributes'].forEach(attribute => {
		let trait_type = attribute['trait_type'];
		let trait_value = attribute['value'];
		// Update table entry for that trait
		$('.modal-title[name=droidy-name]').text('Droidy #' + did);
		$('#foundDroidy table > tbody:last-child')
			.append('<tr> <td>'+trait_type+'</td> <td>'+trait_value+'</td> <td>'+DATA_TRAITS[trait_type][trait_value]+'/'+TOTAL_SUPPLY+'</td> </tr>');
	});
	$('#foundDroidy').modal('show');
	searching_icon(false);
}

function clear_table() {
	$('#foundDroidy table tbody tr').remove();
}

function searching_icon(disp) {
	let text = $('.search-droidy button span');
	let loader = $('.search-droidy button div');
	if(disp) {
		text.hide();
		loader.show();
	} else {
		loader.hide();
		text.show();
	}
}

function findRank(dname) {
	let rank = 1;
	for(const [name, score] of Object.entries(DATA_SCORES)) {
		if(dname == name) {
			return rank;
		}
		rank += 1;
	};
	return -1; // something wrong if reached here
}

function search_updated() {
	let droidy_num = $('#droidNum').val().trim();
	if(rg.test(droidy_num)) {
		enableSearch();
	} else {
		disableSearch();
	}
}

function searchAlert(show, msg='') {
	let alert = $('.search-droidy .alert');
	if(show) {
		alert.text(msg);
		alert.show();
	} else {
		alert.text('');
		alert.hide();
	}
}

function connectAlert(show, msg='') {
	let alert = $('#chooseWalletModal .alert');
	if(show) {
		alert.text(msg);
		alert.show();
	} else {
		alert.text('');
		alert.hide();
	}
}

function mintAlert(show, msg='', success=false, info=false) {
	let alert = $('.mint-body .alert');
	if(!success) {
		alert.removeClass('alert-success');
		alert.addClass('alert-danger');
	} else {
		alert.removeClass('alert-danger');
		if(info) {
			alert.addClass('alert-info');
		} else {
			alert.addClass('alert-success');
		}
	}
	if(show) {
		alert.text(msg);
		alert.show();
	} else {
		alert.text('');
		alert.hide();
	}
}

function enableSearch() {
	$('.search-droidy button').prop('disabled', false);
}

function disableSearch() {
	$('.search-droidy button').prop('disabled', true);
}

function handleLogin() {
	updateSupplyView();
	updateUserInfo();
}

function updateUserInfo() {
	if(link.account) {
		ADDRESS = String(link.account.address);
		NAME = String(link.account.name);
		SOUL_BALANCE = 0; 
		DROIDIES = [];
		if(link.account.balances) {
			link.account.balances.forEach(entry => {
				if(entry['symbol'] == 'SOUL') {
					SOUL_BALANCE = parseInt(entry['value']) / SOUL_DECIMALS;
				} 
			});
		}
		$("#userInfo span[name=balance]").text(SOUL_BALANCE);
		updateUserDroidies();
		$("#userInfo span[name=wallet-type]").text(link.wallet);
		$("#userInfo span[name=name]").text(NAME);
		$("#userInfo span[name=address]").text(ADDRESS.substring(0,6)+'...'); $("#userInfo span[name=address]").attr('title', ADDRESS);
	}
}

function clearGallery() {
	$('#droidies-owned .row').empty();
}

function updateUserDroidies() {
	// let URL = RPC_URL + 'api/getTokenBalance?account=' + ADDRESS + '&tokenSymbol=' + TOKEN_SYMBOL + '&chainInput=main';
	clearGallery();
	// fetch(URL).then(response => {
	// 	if(response.ok) {
	// 		response.json().then(data => {
	// 			if(data && data['amount'] > 0) {
	// 				DROIDIES = data['ids'];
	// 				getDroidiesInfo();
	// 			}
	// 		});
	// 	} else {
	// 		console.log(response);
	// 	}
	// }).catch(error => {
	// 	console.log(error);
	// });
	let URL = DROIDIES_API_URL + '/balance?chain=' + CHAIN + '&address='  + ADDRESS;

	const options = {
	  method: 'GET',
	  mode: 'no-cors'
	};

	fetch(URL, options).then(response => {
		if(response.ok) {
			response.json().then(data => {
				if(data && !data.error && data['balance'] > 0) {
					DROIDIES = data['droidies'];
					getDroidiesInfo();
				}
				console.log(data);
			});
		} else {
			console.log(response);
		}
	}).catch(error => {
		console.log(error);
	});
}


function getDroidiesInfo() {
	if(DROIDIES && DROIDIES.length > 0) {
		$('#showMyDroidies').text(DROIDIES.length);
		$('#threeD_in_modal').attr('href', '../gallery/index.html?address='+ADDRESS);
		$('#my-3').attr('href', '../gallery/index.html?address='+ADDRESS); $('#my-3').show();
		DROIDIES.forEach(droidID => {
		// 	console.log("Fetching user droidy: " + droidID);
		// 	let URL = RPC_URL + 'api/getNFT?symbol=' + TOKEN_SYMBOL + '&IDtext=' + droidID;
		// 	fetch(URL).then(response => {
		// 		if(response.ok) {
		// 			response.json().then(data => {
		// 				let rom = data['rom'];
		// 				let droid_idx = (phantasmaJS.phantasmaJS.decodeVMObject(rom))['idx'];
		// 				$('#droidies-owned .row').append('<div class="droidy-result col-4 mb-2"> <img src="'+IMAGES_URL+droid_idx+'.png" alt="Droidy" class="img-thumbnail figure-img"><figcaption class="figure-caption">Droidy #'+droid_idx+'</figcaption></div>');
		// 			});
		// 			$('#owned').show();
		// 		} else {
		// 			console.log(response);
		// 		}
		// 	}).catch(error => {
		// 		console.log(error);
		// 	});
			let URL = DROIDIES_API_URL + '/getDroidy?chain=' + CHAIN + '&id='  + droidID;
			fetch(URL).then(response => {
				if(response.ok) {
					response.json().then(data => {
						if(data && !data.error) {
							let droid_idx = data['idx'];
							$('#droidies-owned .row').append('<div class="droidy-result col-4 mb-2"> <img src="'+IMAGES_URL+droid_idx+'.png" alt="Droidy" class="img-thumbnail figure-img"><figcaption class="figure-caption">Droidy #'+droid_idx+'</figcaption></div>');
						} else {
							console.log(data);
						}
					});
				$('#owned').show();
				} else {
					console.log(response);
				}
			}).catch(error => {
				console.log(error);
			});
		});
	}
}

function updateSupplyView() {
	let script_builder = new ScriptBuilder();
  	var script = script_builder.callContract(CONTRACT_NAME, 'getCurrentSupply', []).endScript();
	link.invokeRawScript('main' , script, CONTRACT_NAME, (script) => {
	    let supply = phantasma.phantasmaJS.decodeVMObject(script.result);
			let minted = TOTAL_SUPPLY - supply;
			MAX_POSSIBLE_TRANSACTION = supply;
			$('span[name=minted]').text(minted + '/' + TOTAL_SUPPLY);
			// reset mint view
			$('input[name=num-to-mint]').val(0);
			$('#mintButton').attr('disabled', true);
			$('.num-to-mint').text(0);
			$('.price-value').text(0);
			// show connected info
		    $("#connectWalletButton").hide();
			$(".mint-container").show();
  });
	$('.connected-info').show();
	$('#owned').hide();
	$('#my-3').hide();

}

function handleLogout() {
	$("#connectWalletButton").show();
	$(".mint-container").hide();
	$('.connected-info').hide();
	$('owned').hide();
	$('#my-3').hide();
	mintAlert(false);
	minting(false);
}


function connectWalletHandler() {
	connectAlert(false); 
	wallet_type = $(this).attr('name');
	loginToPhantasma(wallet_type);
}

function connectingWallet(wt, con) {
	let btn = $('button[name=' + wt + '] span');
	let loading = $('button[name=' + wt + '] div');
	if(con) {
		$('button[name=' + wt + ']').attr('disabled', true);
		btn.hide();
		loading.show();
	} else {
		$('button[name=' + wt + ']').attr('disabled', false);
		btn.show();
		loading.hide();
	}
}

function minting(con) {
	let btn = $('#mintButton span');
	let loader = $('#mintButton .loader');
	if(con) {
		$('#mintButton').attr('disabled',true);
		btn.hide();
		loader.show();
	} else {
		$('#mintButton').attr('disabled',false);
		loader.hide();
		btn.show();
	}
}

// MINT HANDLER
function mintHandler() {

	mintAlert(false); minting(true);
	let numToMint = parseInt($('input[name=num-to-mint]').val());
	if(!link.account) {
		mintAlert(true, msg='Wallet is not connected properly, please refresh and connect it again')
		minting(false);
		return;
	}

	let userAddress = String(link.account.address);
	let args = [userAddress, numToMint];
	var script_builder = new ScriptBuilder()
                .allowGas(userAddress)
                .callContract(CONTRACT_NAME, 'mint', args);
    var script = script_builder.spendGas(userAddress).endScript();

    mintAlert(true, msg="Check your wallet to sign the transaction", success=true, info=true);
    link.sendTransaction("main", script, CONTRACT_NAME, (script) =>
    {
        console.log("result:", script);
        if(script.success) {
        	mintAlert(true, msg='Mint successful, congrats! Check your wallet for dropped droidie(s), or check it from here to the top right :)', success=true);
        	handleLogin(); // refresh info
        } else { // maybe user rejected
        	mintAlert(true, msg='Mint failed. Make sure to accept the transaction in your wallet to mint');
        }
        minting(false);
    });

}

function loginToPhantasma(wallet) { 
	connectingWallet(wallet, true);
	link.login(
      function (success) {
          if (success) {
            handleLogin();
            $('#chooseWalletModal').modal('hide');
            connectAlert(false);
          } else {
          	handleLogout();
            connectAlert(true, "Failed to connect wallet: Make sure you use PC and not Mobile, and check if your wallet account is open");
          }
          connectingWallet(wallet, false);
      },
      linkVersion,
      "phantasma",
      wallet
  );
}

function updatePrice() {

	let type = $(this).attr('name');

	let numToMint = $('input[name=num-to-mint]');
	let numToMintValue = parseInt(numToMint.val());

	let numToMintField = $('.num-to-mint');

	if(type=='add') {
		$('.sub').attr('disabled', false);
		let newValue = numToMintValue+1;
		if(newValue <= MAX_MINT_PER_TRASNACTION) {
			numToMint.val(newValue);
			$(this).attr('disabled', false);
			if(newValue==MAX_MINT_PER_TRASNACTION)
				$(this).attr('disabled',true);
		} 
		if(newValue > MAX_POSSIBLE_TRANSACTION ) {
			numToMint.val(MAX_POSSIBLE_TRANSACTION);
			$(this).attr('disabled', true);
		}
	} else {
		$('.add').attr('disabled',false);
		let newValue = numToMintValue-1
		if(newValue > 0) {
			$(this).attr('disabled', false);
			numToMint.val(newValue);
		} else {
			numToMint.val(0);
			$(this).attr('disabled', true);
		}
	}
	if(numToMint.val() > 0) {
		$('#mintButton').attr('disabled', false);
	} else {
		$('#mintButton').attr('disabled', true);
	}
	numToMintField.text(numToMint.val());
	let price_in_soul = parseInt(parseInt(numToMint.val())*PRICE_IN_SOUL)
	$('.price-value').text(price_in_soul);
	if(price_in_soul > SOUL_BALANCE) {
		$('#mintButton').attr('disabled', true);
		mintAlert(true, msg='You do not have enough SOUL for this transaction', success=false);
	} else {
		mintAlert(false);
	}
}

