import fs from "fs";

const NEWLINE = "\r\n";

const uniq = (items) => {
  const foundItems = new Set();
  const uniqueItems = [];
  items.forEach((item) => {
    if (foundItems.has(item)) return;
    uniqueItems.push(item);
    foundItems.add(item);
  });

  return uniqueItems;
};

function main(args) {
  const [fpath] = args;
  const rows = fs.readFileSync(fpath, { encoding: "utf8" }).split(NEWLINE);

  const csv = uniq(rows).join(NEWLINE);

  fs.writeFileSync(fpath, csv, { encoding: "utf8" });
}

main(process.argv.slice(2));
