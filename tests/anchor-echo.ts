import * as anchor from "@project-serum/anchor";
import { BN, getProvider } from "@project-serum/anchor";
import { SystemProgram } from "@solana/web3.js";
import assert from "assert";

describe("anchor-echo", () => {
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.AnchorEcho;
  const echoBufferKeypair = anchor.web3.Keypair.generate();
  const bufferSeed = new BN(42);
  const bufferSize = new BN(19);
  const cache = {};

  it("initialize echo", async () => {
    const initializeEchoTx = await program.methods
      .initializeEcho()
      .accounts({
        echoBuffer: echoBufferKeypair.publicKey,
        signer: getProvider().wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([echoBufferKeypair])
      .rpc();
    console.log("initialize echo tx sig", initializeEchoTx);
  });

  it("echo", async () => {
    const echoTx = await program.methods
      .echo(Buffer.from(anchor.utils.bytes.utf8.encode("echo")))
      .accounts({ echoBuffer: echoBufferKeypair.publicKey })
      .rpc();
    console.log("echo tx sig", echoTx);

    let echoBuffer = await program.account.echoBuffer.fetch(
      echoBufferKeypair.publicKey
    );
    assert.equal(
      anchor.utils.bytes.utf8.decode(echoBuffer.buffer.data),
      "echo"
    );
  });

  it("echo buffer overwrite", async () => {
    try {
      const echoTx = await program.methods
        .echo(
          Buffer.from(anchor.utils.bytes.utf8.encode("echo buffer overwrite"))
        )
        .accounts({ echoBuffer: echoBufferKeypair.publicKey })
        .rpc();
      console.log("echo buffer overwrite tx sig", echoTx);
      // JS really needs `try-except-else`
      assert.fail("echo buffer overwrite should have failed");
    } catch (e) {
      let echoBuffer = await program.account.echoBuffer.fetch(
        echoBufferKeypair.publicKey
      );
      assert.equal(
        anchor.utils.bytes.utf8.decode(echoBuffer.buffer.data),
        "echo"
      );
    }
  });

  it("zero copy echo", async () => {
    const zeroCopyEchoBufferKaypair = anchor.web3.Keypair.generate();
    const zeroCopyEchoTx = await program.methods
      .zeroCopyEcho(
        Buffer.from(anchor.utils.bytes.utf8.encode("zero copy echo"))
      )
      .accounts({
        zeroCopyEchoBuffer: zeroCopyEchoBufferKaypair.publicKey,
        signer: getProvider().wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([zeroCopyEchoBufferKaypair])
      .rpc();
    console.log("zero copy echo tx sig", zeroCopyEchoTx);

    let zeroCopyEchoBuffer = await program.account.zeroCopyEchoBuffer.fetch(
      zeroCopyEchoBufferKaypair.publicKey
    );
    assert.equal(
      anchor.utils.bytes.utf8.decode(
        Buffer.from(zeroCopyEchoBuffer.buffer.data)
      ),
      "zero copy echo"
    );
  });

  it("zero copy echo buffer overflow", async () => {
    const zeroCopyEchoBufferKaypair = anchor.web3.Keypair.generate();
    try {
      const zeroCopyEchoTx = await program.methods
        .zeroCopyEcho(
          Buffer.from(
            anchor.utils.bytes.utf8.encode("zero copy echo buffer overflow")
          )
        )
        .accounts({
          zeroCopyEchoBuffer: zeroCopyEchoBufferKaypair.publicKey,
          signer: getProvider().wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([zeroCopyEchoBufferKaypair])
        .rpc();
      console.log("zero copy echo buffer overflow tx sig", zeroCopyEchoTx);
      assert.fail("zero copy echo buffer overflow should have failed");
    } catch (e) {
      assert.ok("zero copy echo buffer overflow tx failed as expected")
    }
  });

  it("initialize authorized echo", async () => {
    const initializeAuthorizedEchoTxSig = await program.methods
      .initializeAuthorizedEcho(bufferSeed, bufferSize)
      .accounts({
        authorizedBuffer: await getPda(),
        authority: getProvider().wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log(
      "initialize authorized echo tx sig",
      initializeAuthorizedEchoTxSig
    );
  });

  it("authorized echo", async () => {
    const authorizedEchoTxSig = await program.methods
      .authorizedEcho(
        Buffer.from(anchor.utils.bytes.utf8.encode("authorized echo"))
      )
      .accounts({
        authorizedBuffer: await getPda(),
        authority: getProvider().wallet.publicKey,
      })
      .rpc();
    console.log("authorized echo tx sig", authorizedEchoTxSig);

    const authorizedBuffer = await program.account.authorizedBuffer.fetch(
      await getPda()
    );
    assert.equal(authorizedBuffer.bufferSeed.toNumber(), bufferSeed.toNumber());
    assert.equal(authorizedBuffer.bufferSize.toNumber(), bufferSize.toNumber());
    assert.equal(
      anchor.utils.bytes.utf8.decode(authorizedBuffer.buffer.data),
      "authorized echo"
    );
  });

  const getPda = async () => {
    if (!cache.pda) {
      const [pda, bumpSeed] = await anchor.web3.PublicKey.findProgramAddress(
        [
          anchor.utils.bytes.utf8.encode("authority"),
          getProvider().wallet.publicKey.toBytes(),
          bufferSeed.toArray("le", 8),
        ],
        program.programId
      );
      cache.pda = pda;
    }
    return cache.pda;
  };
});
