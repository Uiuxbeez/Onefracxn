(function () {
	"use strict";

	var icons = document.querySelectorAll(".stat-icon-draw");
	if (!icons.length) return;

	var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	icons.forEach(function (svg) {
		var paths = svg.querySelectorAll("path");

		paths.forEach(function (path, i) {
			var color = path.getAttribute("fill") || "#151515";
			path.style.stroke = color;
			path.style.strokeWidth = "2";

			if (reduceMotion) return;

			var length = path.getTotalLength();
			path.style.strokeDasharray = length;
			path.style.strokeDashoffset = length;
			path.style.transitionDelay = (i * 0.09) + "s";
		});
	});

	if (reduceMotion) return;

	var observer = new IntersectionObserver(function (entries, obs) {
		entries.forEach(function (entry) {
			if (!entry.isIntersecting) return;
			entry.target.classList.add("is-drawn");
			obs.unobserve(entry.target);
		});
	}, { threshold: 0.3 });

	icons.forEach(function (svg) {
		observer.observe(svg);
	});
})();
