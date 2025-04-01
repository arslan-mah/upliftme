class PeerService {
  public peer: RTCPeerConnection;

  constructor() {
    this.peer = new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:global.stun.twilio.com:3478",
          ],
        },
      ],
    });
  }


  async getAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    await this.peer.setRemoteDescription(offer);
    const answer = await this.peer.createAnswer();
    await this.peer.setLocalDescription(answer);
    return answer;
  }

  async setLocalDescription(desc: RTCSessionDescriptionInit): Promise<void> {

    if (this.peer.signalingState === 'stable') {
      // If it is stable, set the local description
      await this.peer.setLocalDescription(desc);
    } else {
      throw new Error("Cannot set local description while signaling state is not stable.");
    }
  }

  async getOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.peer.createOffer();
    await this.peer.setLocalDescription(offer);
    return offer;
  }
}

const peer = new PeerService();
export default peer;