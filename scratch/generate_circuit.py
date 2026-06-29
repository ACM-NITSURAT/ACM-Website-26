import random
import os

def generate_circuit_svg(width=800, height=400, num_paths=250, num_dots=300):
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">\n'
    svg += '  <rect width="100%" height="100%" fill="transparent" />\n'
    
    # Generate paths
    for _ in range(num_paths):
        x = random.randint(0, width // 20) * 20
        y = random.randint(0, height // 20) * 20
        
        path_d = f"M {x} {y} "
        
        segments = random.randint(2, 6)
        current_x, current_y = x, y
        
        for _ in range(segments):
            direction = random.choice(['H', 'V', 'D']) # Equal probability for 45-degree angles
            length = random.randint(1, 4) * 20
            
            if direction == 'H':
                current_x += length if random.choice([True, False]) else -length
                path_d += f"H {current_x} "
            elif direction == 'V':
                current_y += length if random.choice([True, False]) else -length
                path_d += f"V {current_y} "
            else:
                l = length
                dx = l if random.choice([True, False]) else -l
                dy = l if random.choice([True, False]) else -l
                current_x += dx
                current_y += dy
                path_d += f"L {current_x} {current_y} "
                
        stroke_color = 'rgba(15, 23, 42, 0.4)' # Crisp dark slate
        stroke_width = random.choice([1, 1.5])
        svg += f'  <path d="{path_d}" fill="none" stroke="{stroke_color}" stroke-width="{stroke_width}" />\n'
        
    # Generate dots/nodes at path ends
    for _ in range(num_dots):
        x = random.randint(0, width // 20) * 20
        y = random.randint(0, height // 20) * 20
        r = random.choice([2, 2.5, 3])
        fill_color = 'rgba(15, 23, 42, 0.6)'
        svg += f'  <circle cx="{x}" cy="{y}" r="{r}" fill="{fill_color}" />\n'
        
    svg += '</svg>'
    
    output_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'circuit-texture.svg')
    with open(output_path, 'w') as f:
        f.write(svg)
    print("Generated", output_path)

if __name__ == '__main__':
    generate_circuit_svg()
