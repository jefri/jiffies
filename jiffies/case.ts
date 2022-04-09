export function dashCase(identifier: string) {
	return identifier.replace(
		/([a-z])([A-Z])/g,
		(_, a, b) => `${a}-${b.toLowerCase()}`,
	).replace(/ ([A-Z])/g, (_, b) => `-${b.toLowerCase()}`);
}
