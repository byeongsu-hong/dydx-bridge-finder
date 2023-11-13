import { useState } from "react";
import "./App.css";

import { formatEther } from "viem";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import {
  Table,
  TableCaption,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "./components/ui/table";

const AVG_BLOCK_TIME = 6.5;

type DelayedMessagesResponse = {
  messages: DelayedMessage[];
};

type DelayedMessage = {
  message: {
    authority: string;
    event: {
      id: number;
      coin: Coin;
      address: string;
      eth_block_height: string;
    };
  };
  block_height: number;
};

type Coin = {
  denom: string;
  amount: string;
};

const BASE_URL = "https://dydx-dao-api-1.polkachu.com";

// ${BASE_URL}/cosmos/distribution/v1beta1/delegators/${delegator}/rewards

class QuerySingleton {
  private messages: DelayedMessage[] | undefined = undefined;

  constructor() {}

  private getDelayedMessages = async (): Promise<DelayedMessage[]> => {
    const resp = await fetch(
      `${BASE_URL}/dydxprotocol/v4/bridge/delayed_complete_bridge_messages`
    );
    const jsonResp: DelayedMessagesResponse = await resp.json();
    return jsonResp.messages;
  };

  async get(): Promise<DelayedMessage[]> {
    if (!this.messages) {
      this.messages = await this.getDelayedMessages();
    }
    return this.messages;
  }
}

function App() {
  const querySingleton = new QuerySingleton();

  const [block, setBlock] = useState<{ height: number; time: number }>();
  const [searchedMessages, setSearchedMessages] = useState<DelayedMessage[]>();
  const [address, setAddress] = useState<string>();

  const search = () => {
    console.log("searching");

    (async () => {
      // fetch block
      const resp = await fetch(
        `${BASE_URL}/cosmos/base/tendermint/v1beta1/blocks/latest`
      );
      const jsonResp = await resp.json();
      const header = jsonResp.block.header;

      setBlock({
        height: Number(header.height),
        time: Math.floor(new Date(header.time).getTime() / 1000),
      });

      // search messages
      querySingleton.get().then((messages) => {
        console.log({ messages, address });

        const searched = messages.filter(
          ({ message }) => message.event.address === address
        );

        console.log(searched);

        setSearchedMessages(searched);
      });
    })();
  };

  return (
    <>
      {!searchedMessages ? (
        <>
          <h1 style={{ fontWeight: "bold", fontSize: "2em" }}>
            Search DYDX Bridge Status
          </h1>
          <br />
          <div className="grid" style={{ width: "100%" }}>
            <Input
              id="search-input"
              style={{ textAlign: "center" }}
              type="text"
              placeholder="dydx1deadbeef..."
              onChange={(event) => setAddress(event.target.value)}
            />
            <Button type="submit" onClick={search}>
              Search
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="grid" style={{ width: "100%" }}>
            <Button type="reset" onClick={() => setSearchedMessages(undefined)}>
              Back
            </Button>
          </div>

          <Table>
            <TableCaption>A list of your bridged events.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">ID</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Release Time</TableHead>
                <TableHead className="text-right">Release Block</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {searchedMessages.map(({ message, block_height }) => (
                <TableRow key={message.event.id}>
                  <TableCell className="font-medium">
                    {message.event.id}
                  </TableCell>
                  <TableCell className="text-right">{`${formatEther(
                    BigInt(message.event.coin.amount)
                  )} dydx`}</TableCell>
                  <TableCell className="text-right">
                    {new Date(
                      (Math.floor(
                        (block_height - (block?.height || 0)) * AVG_BLOCK_TIME
                      ) +
                        (block?.time || Math.floor(Date.now() / 1000))) *
                        1000
                    ).toISOString()}
                  </TableCell>
                  <TableCell className="text-right">{block_height}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </>
  );
}

export default App;
