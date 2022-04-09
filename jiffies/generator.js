export function* takeWhile(predicate, iterator) {
	for (const x of iterator) {
		if (predicate(x)) {
			yield x;
		} else {
			return;
		}
	}
}
