// COLLECTION INFO
const TOTAL_SUPPLY = 2222;

const BASE_IMAGES_URL = 'https://ipfs.io/ipfs/QmPWtZvZyzrm9tZ5UyJH7aCL2DGfQ3PCTCC2kwD5P6AW6B/';
// const BASE_INFO_URL = 'https://ipfs.io/ipfs/QmUA3rbhf8qLCvNsHjTa1u31EXHHuBqHT1zBb1XfvjUXKJ/';
const BASE_INFO_URL = '../../rarities/'

const IMAGES_URL = BASE_IMAGES_URL;
const METADATA_URL = BASE_INFO_URL;
const RARITY_DATA_URL = BASE_INFO_URL;

// CHAIN and CONTRACT INFO
const CHAIN = 'testnet'; // testnet, main
const CONTRACT_NAME = 'DROID';
const TOKEN_SYMBOL = 'DROID';
const PRICE_IN_SOUL = 5;
const SOUL_DECIMALS = 100000000;
const MAX_MINT_PER_TRASNACTION = 10;
var MAX_POSSIBLE_TRANSACTION = MAX_MINT_PER_TRASNACTION;
var RPC_URL = "";

function chooseChain(chain) {
	if (chain == "main") {
		RPC_URL = "http://207.148.17.86:7078/";
	} else if(chain == "testnet") {
		RPC_URL = "http://testnet.phantasma.io:7078/";
	} else {
		RPC_URL = "http://127.0.0.1:7078/";
	}
}

chooseChain(CHAIN);