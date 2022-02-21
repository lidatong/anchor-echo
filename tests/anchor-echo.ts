import * as anchor from "@project-serum/anchor";
import { BN, getProvider, Program } from "@project-serum/anchor";
import { SystemProgram } from "@solana/web3.js";
import assert from "assert";

describe("anchor-echo", () => {
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.AnchorEcho;
  const bufferSeed = new BN(42);
  const bufferSize = new BN(19);

  it("echo", async () => {
    const echoBufferKeypair = anchor.web3.Keypair.generate();
    const echoTx = await program.methods
      .echo(Buffer.from(anchor.utils.bytes.utf8.encode("echo")))
      .accounts({
        echoBuffer: echoBufferKeypair.publicKey,
        signer: getProvider().wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([echoBufferKeypair])
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

  it("initialize authorized echo", async () => {
    const [pda, _] = await anchor.web3.PublicKey.findProgramAddress(
      [
        anchor.utils.bytes.utf8.encode("authority"),
        getProvider().wallet.publicKey.toBytes(),
        bufferSeed.toArray("le", 8),
      ],
      program.programId
    );
    const initializeAuthorizedEchoTxSig = await program.methods
      .initializeAuthorizedEcho(bufferSeed, bufferSize)
      .accounts({
        authorizedBuffer: pda,
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
    const [pda, bump_seed] = await anchor.web3.PublicKey.findProgramAddress(
      [
        anchor.utils.bytes.utf8.encode("authority"),
        getProvider().wallet.publicKey.toBytes(),
        bufferSeed.toArray("le", 8),
      ],
      program.programId
    );
    const authorizedEchoTxSig = await program.methods
      .authorizedEcho(
        Buffer.from(anchor.utils.bytes.utf8.encode("authorized echo"))
      )
      .accounts({
        authorizedBuffer: pda,
        authority: getProvider().wallet.publicKey,
      })
      .rpc();
    console.log("authorized echo tx sig", authorizedEchoTxSig);

    const authorizedBuffer = await program.account.authorizedBuffer.fetch(pda);
    assert.equal(authorizedBuffer.bufferSeed.toNumber(), bufferSeed.toNumber());
    assert.equal(authorizedBuffer.bufferSize.toNumber(), bufferSize.toNumber());
    assert.equal(
      anchor.utils.bytes.utf8.decode(authorizedBuffer.buffer.data),
      "authorized echo"
    );
  });
});
