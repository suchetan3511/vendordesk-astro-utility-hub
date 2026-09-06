import { motion } from "motion/react";

export default function MotionDemo() {
	return (
		<motion.div
			initial={{ opacity: 0, x: -100 }}
			animate={{ opacity: 1, x: 100 }}
			transition={{ duration: 0.8, ease: "easeOut" }}
			style={{
				width: 80,
				height: 80,
				borderRadius: 12,
				background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
			}}
		/>
	);
}
