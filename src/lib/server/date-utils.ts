/**
 * 日付ユーティリティ
 *
 * タイムゾーンを考慮した日付フォーマット処理
 */

/**
 * Date オブジェクトを YYYY-MM-DD 形式の文字列に変換
 *
 * toISOString() はUTCで変換されるため、JST（ローカルタイムゾーン）の
 * 日付と異なる可能性がある。この関数は Date オブジェクトのローカル日付を
 * そのまま YYYY-MM-DD 形式で返す。
 *
 * 例:
 * - JST 2025-01-16 00:30 → "2025-01-16"（正しい）
 * - toISOString().split('T')[0] → "2025-01-15"（UTCに変換されるため間違い）
 *
 * @param date - Date オブジェクト
 * @returns YYYY-MM-DD 形式の文字列
 */
export function formatDateAsLocal(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}
