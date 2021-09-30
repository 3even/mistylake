async function setup() {
    if (typeof web3 === 'undefined') {
        alert('Please install/enable MetaMask and reload the page');
        return;
    }

    web3 = new Web3(web3.currentProvider);

    let lastNetworkId = null;
    async function checkNetwork() {
        const SMARTBCH_NETWORK_ID         = 10000;
        const SMARTBCH_TESTNET_NETWORK_ID = 10001;
        const GANACHE_NETWORK_ID          = 5777;

        const id = await web3.eth.net.getId();

        if (id === lastNetworkId) {
            return true;
        }

        if (id === SMARTBCH_NETWORK_ID
         || id === SMARTBCH_TESTNET_NETWORK_ID
         || id === GANACHE_NETWORK_ID
        ) {
            return true;
        } else {
            alert('Wrong network');
            return false;
        }

        lastNetworkId = id;
        return true;
    }
    if (! checkNetwork()) {
        return;
    }

    // detect Network account change
    window.ethereum.on('networkChanged', (networkId) => {
        checkNetwork();
    });


    async function getAccount() {
        return new Promise((resolve, reject) => {
            web3.eth.getAccounts(async (error, accounts) => {
                if (error) {
                    reject(error);
                }

                if (accounts.length === 0) {
                    await ethereum.request({ method: 'eth_requestAccounts' });
                    return await getAccount();
                }


                resolve(accounts[0]);
            });
        });
    }

    document.getElementById('step-1-btn').addEventListener('click', async function() {
        const account = await getAccount();
        document.getElementById('smartbch-address').value = account;
        document.getElementById('step-1').style.display = 'none';
        document.getElementById('step-2').style.display = 'block';
    });

    document.getElementById('step-2-btn').addEventListener('click', async function() {
        let slpAddress = null;
        try {
            const account = await getAccount();
            console.log('account', account)

            // get slpAddress from backend
            const slpAddressRes = await fetch('/request-address', {
                method: 'POST',
                mode: 'same-origin',
                cache: 'no-cache',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    account,
                    other: 100,
                }),
            });
            const slpAddressJson = await slpAddressRes.json();
            console.log(slpAddressJson)

            if (! slpAddressJson.success) {
                alert(`something went wrong, try again later.. ${slpAddressJson.message}`);
                return;
            }

            slpAddress = slpAddressJson.address;
        } catch (e) {
            alert(`Could not get slp address, please try again later: ${e}`);
            return;
        }

        document.getElementById('slp-address').value = slpAddress;
        document.getElementById('step-2').style.display = 'none';
        document.getElementById('step-3').style.display = 'block';

        // check insomnia over and over every second for slp deposit
        async function checkBalance() {
            try {
                const res = await fetch(`https://insomnia.fountainhead.cash/v1/address/balance/${slpAddress}`);
                const j = await res.json();
                console.log(j);

                if (! j.success) {
                    throw new Error('no success');
                }

                if (j.confirmed === 0 && j.unconfirmed === 0) {
                    throw new Error('no balance');
                }

                document.getElementById('step-3').style.display = 'none';
                document.getElementById('step-4').style.display = 'block';
            } catch (e) {
                setTimeout(() => checkBalance(), 2000);
            }
        }

        checkBalance();
    });

}

setup();
