/**
 * @param code {number}
 */
function getCommonCloseReasonByCode(code) {
  /**
   1000: 정상 종료
   1001: 엔드포인트가 사라짐
   1002: 프로토콜 오류
   1003: 지원하지 않는 데이터
   1004: 예약됨 (사용하지 않음)
   1005: 정의되지 않은 상태 코드 (내부 사용)
   1006: 연결이 비정상적으로 끊김 (내부 사용)
   1007: 데이터 형식이 일치하지 않음
   1008: 정책 위반
   1009: 메시지가 너무 큼
   1010: 클라이언트가 요구한 확장을 서버가 처리할 수 없음
   1011: 예상치 못한 조건으로 인해 서버가 연결을 종료함
   1015: TLS 핸드셰이크 실패 (내부 사용)
   */
  switch (code) {
    case 1000:
      return "Normal closure";
    case 1001:
      return "Endpoint is gone";
    case 1002:
      return "Protocol error";
    case 1003:
      return "Unsupported data";
    case 1004:
      return "Reserved (not used)";
    case 1005:
      return "Undefined status code (internal use)";
    case 1006:
      return "Connection is closed abnormally (internal use)";
    case 1007:
      return "Data format does not match";
    case 1008:
      return "Policy violation";
    case 1009:
      return "Message is too big";
    case 1010:
      return "Client requested extension that server cannot process";
    case 1011:
      return "Server closed connection due to unexpected condition";
    case 1015:
      return "TLS handshake failure (internal use)";
    default:
      return `Unknown reason: couldn't find reason by code ${code}`;
  }
}

module.exports = {
  getCommonCloseReasonByCode,
}