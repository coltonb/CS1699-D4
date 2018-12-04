Pusher.host = "slanger1.chain.so";
Pusher.ws_port = 443;
Pusher.wss_port = 443;

const pusher = new Pusher("e9f5cc20074501ca7395", {
  encrypted: true,
  disabledTransports: ["sockjs"],
  disableStats: true
});

const ticker = pusher.subscribe("blockchain_update_btc");

const startTime = Date.now();

let totalBtcSent = 0;
let largestTransaction = 0;
let largestTransactionId = "";
let smallestTransaction = 9999;
let smallestTransactionId = "";
let mempool = 0;
let transactionCount = 0;
const transactions = [];

let textCanvas = null;
let textCtx = null;

function updateStats(data) {
  const { txid, sent_value } = data.value;
  totalBtcSent += parseFloat(sent_value);
  transactionCount += 1;
  mempool += 1;
  if (sent_value > largestTransaction) {
    largestTransaction = sent_value;
    largestTransactionId = txid;
  }
  if (sent_value < smallestTransaction) {
    smallestTransaction = sent_value;
    smallestTransactionId = txid;
  }
}

function updateSim(data) {
  const { txid, sent_value } = data.value;
  const startX = Math.random() * 1000;
  const newBody = Bodies.circle(startX, 0, Math.max(5, Math.min(300, sent_value * 10)));
  transactions.push({ id: txid, value: sent_value, body: newBody });
  World.add(engine.world, [newBody]);
}

function updateStatsHTML() {
  $("#btcsent").html(`${totalBtcSent} BTC`);
  $("#largestbtcsent").html(
    `${largestTransaction} BTC (<a href="https://chain.so/tx/BTC/${largestTransactionId}">...${
      largestTransactionId.substring(
        largestTransactionId.length - 8,
        largestTransactionId.length
      )
    }</a>)`
  );
  $("#smallestbtcsent").html(
    `${smallestTransaction} BTC (<a href="https://chain.so/tx/BTC/${smallestTransactionId}">...${
      smallestTransactionId.substring(
        smallestTransactionId.length - 8,
        smallestTransactionId.length
      )
    }</a>)`
  );
  $("#avgbtcsent").html(
    `${totalBtcSent / (Date.now() / 1000 - startTime / 1000)} BTC`
  );
  $("#txpersec").html(
    `${transactionCount / (Date.now() / 1000 - startTime / 1000)}`
  );
  $("#mempool").html(`${mempool}`);
  $("#transaction-header").html(`Transactions List (${transactionCount})`);
}

async function newBlock(data) {
  const {
    blockhash,
    block_no,
    total_txs,
    mined_by,
    previous_blockhash
  } = data.value;
  const blockJson = await (await fetch(
    `https://chain.so/api/v2/get_block/btc/${block_no}`
  )).json();
  const txs = blockJson.data.txs;
  txs.forEach(tx => {
    $(`#${tx}`).append(`<td>${block_no}</td>`);
    if ($(`#${tx}`).length) mempool -= 1;
  });
  $("#blocks-list").prepend(
    `<ul class="list-group">
      <li class="list-group-item"><h4>Block #: ${block_no}</h4></li>
      <li class="list-group-item">Block Hash: ...${blockhash.substring(
        blockhash.length - 8,
        blockhash.length
      )}</li>
      <li class="list-group-item">Total Transactions: ${total_txs}</li>
      <li class="list-group-item">Previous Block Hash: ...${previous_blockhash.substring(
        previous_blockhash.length - 8,
        previous_blockhash.length
      )}</li>
      <li class="list-group-item">Mined by: ${mined_by}</li>
    </ul>`
  );
}

function newTransaction(data) {
  const { txid, sent_value, time } = data.value;
  $("#transactions-list").prepend(
    `<tr id="${txid}">
      <th><a href="https://chain.so/tx/BTC/${txid}">...${txid.substring(txid.length - 8, txid.length)}</a></th>
      <td>${sent_value} BTC</td>
      <td>${time}</td>
    </tr>`
  );
}

ticker.bind("tx_update", data => {
  if (data.type === "tx") {
    newTransaction(data);
    updateStats(data);
    updateSim(data);
    updateStatsHTML();
  }
});

ticker.bind("block_update", async data => {
  if (data.type === "block") {
    newBlock(data);
  }
});

// Visualization code
let Engine = Matter.Engine,
  Render = Matter.Render,
  World = Matter.World,
  Bodies = Matter.Bodies;

let engine = Engine.create();

window.addEventListener("load", function() {
  let render = Render.create({
    canvas: document.querySelector("#canvas"),
    engine: engine,
    options: {
      width: 1000
    }
  });

  let ground = Bodies.rectangle(500, 610, 1000, 60, { isStatic: true });

  World.add(engine.world, [ground]);
  Engine.run(engine);
  Render.run(render);

  textCanvas = document.querySelector("#text-canvas");
  textCtx = textCanvas.getContext("2d");

  function updateText() {
    requestAnimationFrame(updateText);
    textCtx.clearRect(0, 0, 1200, 1000);
    transactions.forEach((transaction, index) => {
      const { id, value, body } = transaction;
      if (body.position.y > 600) {
        World.remove(engine.world, body);
        transactions.splice(index, 1);
      }
      textCtx.font = `normal ${Math.min(30, Math.floor(value) * 10)}px Verdana`;
      textCtx.fillStyle = "#fff";
      textCtx.fillText(
        `...${id.substring(id.length - 8, id.length)} - ${value} BTC`,
        body.position.x,
        body.position.y
      );
    });
  }

  updateText();
});
