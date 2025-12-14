export function formatJstDate(input: Date): string {
	const formatted = new Intl.DateTimeFormat('ja-JP', {
		timeZone: 'Asia/Tokyo',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(input);
	return formatted.replaceAll('/', '-');
}

export function getTodayJstDateString(): string {
	return formatJstDate(new Date());
}

