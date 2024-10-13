import { readCsv, maybeQuote, roundToPrecision } from "./utils.mjs";

function main(args) {
  const [filepath] = args;
  const [_header, ...rows] = readCsv(filepath);
  const groupedByCode = {};
  const shares = {};

  const rpcToSua = readCsv("./rpc-to-sua.csv");

  const code2RpcName = Object.fromEntries(
    rpcToSua.map(([_fx2Code, longCode, fx2Name]) => [longCode, fx2Name])
  );
  const code2SuaName = Object.fromEntries(
    rpcToSua.map(([_fx2Code, longCode, _fx2Name, _suaCode, suaName]) => [
      longCode,
      suaName,
    ])
  );
  const code2SuaCode = Object.fromEntries(
    rpcToSua.map(([_fx2Code, longCode, _fx2Name, suaCode, _suaName]) => [
      longCode,
      suaCode,
    ])
  );

  rows.forEach((row) => {
    const code = row[0];
    if (!(code in groupedByCode)) groupedByCode[code] = [];
    groupedByCode[code].push(row);

    shares[code] = (shares[code] || 0) + parseFloat(row[4]);
  });

  const ERR_THRESHOLD = 0.005;
  console.log("RPC Code,RPC Name,SUA code,SUA name,Sum of shares in file")
  Object.entries(shares)
    //.filter(([_k, v]) => Math.abs(v - 1) > ERR_THRESHOLD)
    .forEach(([code, totalShare]) => console.log([
      code,
      maybeQuote(code2RpcName[code]),
      code2SuaCode[code],
      maybeQuote(code2SuaName[code]),
      roundToPrecision(totalShare, 4)
    ].join(",")));
}

main(process.argv.slice(2));
