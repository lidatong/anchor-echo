import * as anchor from '@project-serum/anchor';
import {BN, getProvider, Program} from '@project-serum/anchor';
import {SystemProgram} from '@solana/web3.js';
import {AnchorEcho} from '../target/types/anchor_echo';
import assert from 'assert';

describe('anchor-echo', () => {
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.AnchorEcho as Program<AnchorEcho>;

  it('echo', async () => {
    const echoBuffer = anchor.web3.Keypair.generate();
    await program.rpc.echo(Buffer.from(anchor.utils.bytes.utf8.encode('echo')), {
      accounts: {
        echoBuffer: echoBuffer.publicKey,
        signer: getProvider().wallet.publicKey,
        systemProgram: SystemProgram.programId
      },
      signers: [echoBuffer]
    });
    let buffer = await program.account.echoBuffer.fetch(echoBuffer.publicKey);
    assert.equal(anchor.utils.bytes.utf8.decode(buffer.data), 'echo');
  });

  it('authorized echo', async () => {
    const bufferSeed = new BN(1);
    const bufferSize = new BN(24);
    const [pda, _] = await anchor.web3.PublicKey.findProgramAddress([
          anchor.utils.bytes.utf8.encode('authority'),
          getProvider().wallet.publicKey.toBytes(),
          bufferSeed.toArray('le', 8)
        ],
        program.programId
    );
    await program.rpc.initializeAuthorizedEcho(
        bufferSeed,
        bufferSize,
        {
          accounts: {
            authorizedBuffer: pda,
            authority: getProvider().wallet.publicKey,
            systemProgram: SystemProgram.programId
          }
        },
    );

    await program.rpc.authorizedEcho(
        Buffer.from(anchor.utils.bytes.utf8.encode('authorized echo')),
        {
          accounts: {
            authorizedBuffer: pda,
            authority: getProvider().wallet.publicKey,
          }
        },
    );

    let buffer = await program.account.authorizedBuffer.fetch(pda);
    assert.equal(anchor.utils.bytes.utf8.decode(buffer.data), 'authorized echo');
  });
});

